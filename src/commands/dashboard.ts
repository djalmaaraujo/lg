import fs from 'fs/promises';
import { Command, CommandOptions } from '../types/index.js';
import { LogEntry, Storage } from '../types/log.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete, STORAGE_FILE } from './setup.js';
import blessed from 'blessed';
import { syncWithGistInBackground, isGistSyncConfigured } from '../utils/gistSync.js';

/**
 * Group entries by date
 * @param entries Array of log entries
 * @returns Object with dates as keys and arrays of entries as values
 */
function groupEntriesByDate(entries: LogEntry[]): Record<string, LogEntry[]> {
  const grouped: Record<string, LogEntry[]> = {};

  entries.forEach((entry) => {
    const date = new Date(entry.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    if (!grouped[dateStr]) {
      grouped[dateStr] = [];
    }

    grouped[dateStr].push(entry);
  });

  return grouped;
}

/**
 * Extract tags from entries
 * @param entries Array of log entries
 * @returns Object with tags as keys and counts as values
 */
function extractTags(entries: LogEntry[]): Record<string, number> {
  const tags: Record<string, number> = {};

  entries.forEach((entry) => {
    const matches = entry.content.match(/#\w+/g);
    if (matches) {
      matches.forEach((tag) => {
        if (!tags[tag]) {
          tags[tag] = 0;
        }
        tags[tag]++;
      });
    }
  });

  return tags;
}

/**
 * Generate a simple calendar view
 * @param entries Array of log entries
 * @returns String representation of the calendar
 */
function generateCalendar(entries: LogEntry[]): string {
  const grouped = groupEntriesByDate(entries);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Get the first day of the month
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  // Get the number of days in the month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Month name
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build the calendar
  let calendar = `    ${monthName}\n`;
  calendar += ' Mo Tu We Th Fr Sa Su \n';

  // Add empty spaces for the first week
  let day = 1;
  let line = ' ';
  for (let i = 0; i < firstDay; i++) {
    line += '   ';
  }

  // Add days
  for (let i = firstDay; i < 7; i++) {
    const dateStr = `${(currentMonth + 1).toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${currentYear}`;
    const hasEntries = Object.keys(grouped).some((date) => date.includes(dateStr));

    if (hasEntries) {
      line += '{bold}' + day.toString().padStart(2, ' ') + '{/bold} ';
    } else {
      line += day.toString().padStart(2, ' ') + ' ';
    }
    day++;
  }
  calendar += line + '\n';

  // Add remaining weeks
  while (day <= daysInMonth) {
    line = ' ';
    for (let i = 0; i < 7 && day <= daysInMonth; i++) {
      const dateStr = `${(currentMonth + 1).toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${currentYear}`;
      const hasEntries = Object.keys(grouped).some((date) => date.includes(dateStr));

      if (hasEntries) {
        line += '{bold}' + day.toString().padStart(2, ' ') + '{/bold} ';
      } else {
        line += day.toString().padStart(2, ' ') + ' ';
      }
      day++;
    }
    calendar += line + '\n';
  }

  return calendar;
}

/**
 * Dashboard command implementation
 */
const dashboardCommand: Command = {
  name: 'dashboard',
  description: 'Display an interactive dashboard for life logs',
  aliases: ['dash'],

  async execute(_args: string[], _options: CommandOptions): Promise<void> {
    try {
      // Check if setup is complete
      if (!(await isSetupComplete())) {
        logger.error('lg is not set up yet. Please run "lg setup" first.');
        return;
      }

      // Read the entries
      const data = await fs.readFile(STORAGE_FILE, 'utf-8');
      const entries: Storage = JSON.parse(data);

      if (entries.length === 0) {
        logger.info('No entries found. Start logging with: lg "Your first entry"');
        return;
      }

      // Sort entries by timestamp (newest first)
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Group entries by date
      const groupedEntries = groupEntriesByDate(entries);

      // Extract tags
      const tags = extractTags(entries);

      // Create a screen object with safer terminal options
      const screen = blessed.screen({
        smartCSR: true,
        title: 'Life Logger Dashboard',
        cursor: {
          artificial: true,
          shape: 'line',
          blink: true,
          color: 'default',
        },
        // Force a simpler terminal type to avoid xterm-256color issues
        terminal: 'xterm',
        // Disable features that might cause terminal compatibility issues
        fullUnicode: false,
        fastCSR: true,
        debug: false,
      });

      // Track if screen has been destroyed
      let isScreenDestroyed = false;

      // Add cleanup handlers
      process.on('exit', () => {
        if (!isScreenDestroyed) {
          screen.destroy();
          isScreenDestroyed = true;
        }
      });

      process.on('SIGINT', () => {
        if (!isScreenDestroyed) {
          screen.destroy();
          isScreenDestroyed = true;
        }
        process.exit(0);
      });

      // Create a box for the header
      blessed.box({
        parent: screen,
        top: 0,
        left: 0,
        width: '100%',
        height: 3,
        content: '{center}{bold}Life Logger Dashboard{/bold}{/center}',
        tags: true,
        border: {
          type: 'line',
        },
        style: {
          fg: 'white',
          bg: 'blue',
          border: {
            fg: 'white',
          },
        },
      });

      // Create a box for the calendar
      blessed.box({
        parent: screen,
        top: 3,
        left: 0,
        width: '30%',
        height: '30%',
        content: generateCalendar(entries),
        tags: true,
        border: {
          type: 'line',
        },
        label: ' Calendar ',
        style: {
          fg: 'white',
          border: {
            fg: 'white',
          },
        },
      });

      // Create a box for recent entries
      const entriesBox = blessed.box({
        parent: screen,
        top: 3,
        left: '30%',
        width: '70%',
        height: '50%',
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
          ch: ' ',
          track: {
            bg: 'gray',
          },
          style: {
            inverse: true,
          },
        },
        keys: true, // Enable keys for scrolling
        vi: true, // Enable vi keys for scrolling
        mouse: true,
        border: {
          type: 'line',
        },
        label: ' Recent Entries ',
        style: {
          fg: 'white',
          border: {
            fg: 'white',
          },
        },
        tags: true, // Ensure tags are enabled
      });

      // Fill the entries box with content - using simple formatting approach
      let entriesContent = '\n';
      Object.keys(groupedEntries).forEach((date) => {
        // Display date without ** ** formatting, but keep it visually distinct
        entriesContent += `  ► ${date}\n\n`;
        groupedEntries[date].forEach((entry) => {
          const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
          entriesContent += `  [${time}] ${entry.content}\n`;
        });
        entriesContent += '\n';
      });
      entriesBox.setContent(entriesContent);

      // Create a box for tags
      const tagsBox = blessed.box({
        parent: screen,
        top: '33%',
        left: 0,
        width: '30%',
        height: '30%',
        scrollable: true,
        keys: true, // Enable keys for scrolling
        border: {
          type: 'line',
        },
        label: ' Tags ',
        padding: {
          left: 2,
          right: 2,
          top: 1,
          bottom: 1,
        },
        style: {
          fg: 'white',
          border: {
            fg: 'white',
          },
        },
        tags: true, // Ensure tags are enabled
      });

      // Fill the tags box with content
      let tagsContent = '';
      Object.entries(tags)
        .sort((a, b) => b[1] - a[1])
        .forEach(([tag, count]) => {
          tagsContent += `${tag} (${count})\n`;
        });
      tagsBox.setContent(tagsContent || 'No tags found');

      // Create a box for quick entry
      const quickEntryBox = blessed.box({
        parent: screen,
        top: '63%',
        left: 0,
        width: '100%',
        height: '20%',
        border: {
          type: 'line',
        },
        label: ' Quick Entry ',
        tags: true, // Ensure tags are enabled for the label
        style: {
          fg: 'white',
          border: {
            fg: 'white',
          },
        },
      });

      // Create a simple box for input instead of a textbox
      const inputBox = blessed.box({
        parent: quickEntryBox,
        top: 0,
        left: 0,
        height: 3,
        width: '100%',
        content: '',
        style: {
          fg: 'white',
        },
        tags: true,
      });

      // Create a help text
      blessed.text({
        parent: quickEntryBox,
        content: 'Press ENTER to edit, ESC to exit edit mode, Ctrl+S to save',
        top: 3,
        left: 0,
      });

      // Create a footer
      blessed.box({
        parent: screen,
        bottom: 0,
        left: 0,
        width: '100%',
        height: 3,
        content:
          '{center}Press q to quit, TAB/e/i to navigate, ENTER to edit, arrow keys to scroll{/center}',
        tags: true,
        border: {
          type: 'line',
        },
        style: {
          fg: 'white',
          bg: 'blue',
          border: {
            fg: 'white',
          },
        },
      });

      // Define modes
      const ENTRIES_VIEW = 0;
      const INPUT_VIEW = 1;
      const EDITING_MODE = 2;
      let activeMode = ENTRIES_VIEW;

      // Track input state
      let currentInput = '';
      let inputCursor = 0;

      // Function to update the display based on active mode
      const updateDisplay = () => {
        // Reset all labels to default
        entriesBox.setLabel(' Recent Entries ');
        tagsBox.setLabel(' Tags ');
        quickEntryBox.setLabel(' Quick Entry ');

        if (activeMode === ENTRIES_VIEW) {
          entriesBox.setLabel(' \u001b[32m[ACTIVE] Recent Entries\u001b[0m ');
          entriesBox.focus();
          inputBox.setContent(currentInput);
        } else if (activeMode === INPUT_VIEW) {
          quickEntryBox.setLabel(' \u001b[32m[ACTIVE] Quick Entry\u001b[0m ');
          inputBox.setContent(currentInput);
          // Don't focus anything in view mode
        } else if (activeMode === EDITING_MODE) {
          quickEntryBox.setLabel(' \u001b[32m[EDITING] Quick Entry\u001b[0m ');

          // Show cursor in input box
          const beforeCursor = currentInput.substring(0, inputCursor);
          const atCursor = currentInput.substring(inputCursor, inputCursor + 1) || ' ';
          const afterCursor = currentInput.substring(inputCursor + 1);

          inputBox.setContent(beforeCursor + '{inverse}' + atCursor + '{/inverse}' + afterCursor);
          // Don't focus anything in editing mode
        }

        screen.render();
      };

      // Direct key for entries view (only works in navigation mode)
      screen.key('e', () => {
        if (activeMode !== EDITING_MODE) {
          activeMode = ENTRIES_VIEW;
          updateDisplay();
        }
      });

      // Direct key for input view (only works in navigation mode)
      screen.key('i', () => {
        if (activeMode !== EDITING_MODE) {
          activeMode = INPUT_VIEW;
          updateDisplay();
        }
      });

      // Handle escape and q to exit
      screen.key(['escape', 'q', 'C-c'], (_, key) => {
        // If in editing mode, exit to input view
        if (activeMode === EDITING_MODE && key.name === 'escape') {
          activeMode = INPUT_VIEW;
          updateDisplay();
          return;
        }

        // If in input view, exit to entries view on Escape
        if (activeMode === INPUT_VIEW && key.name === 'escape') {
          activeMode = ENTRIES_VIEW;
          updateDisplay();
          return;
        }

        // Otherwise, exit the dashboard
        screen.destroy();
        isScreenDestroyed = true;
        return process.exit(0);
      });

      // Focus on input when Enter is pressed
      screen.key('enter', () => {
        if (activeMode === ENTRIES_VIEW) {
          // From entries view, go to input view
          activeMode = INPUT_VIEW;
          updateDisplay();
        } else if (activeMode === INPUT_VIEW) {
          // From input view, enter editing mode
          activeMode = EDITING_MODE;
          updateDisplay();
        } else if (activeMode === EDITING_MODE) {
          // In editing mode, Enter adds a newline
          currentInput += '\n';
          inputCursor = currentInput.length;
          updateDisplay();
        }
      });

      // Handle input in EDITING_MODE
      screen.on('keypress', (ch, key) => {
        if (activeMode !== EDITING_MODE || !key) return;

        // Handle special keys
        if (key.name === 'backspace') {
          if (inputCursor > 0) {
            currentInput =
              currentInput.substring(0, inputCursor - 1) + currentInput.substring(inputCursor);
            inputCursor--;
          }
        } else if (key.name === 'delete') {
          currentInput =
            currentInput.substring(0, inputCursor) + currentInput.substring(inputCursor + 1);
        } else if (key.name === 'left') {
          if (inputCursor > 0) inputCursor--;
        } else if (key.name === 'right') {
          if (inputCursor < currentInput.length) inputCursor++;
        } else if (key.name === 'home') {
          inputCursor = 0;
        } else if (key.name === 'end') {
          inputCursor = currentInput.length;
        } else if (!key.ctrl && !key.meta && ch && ch.length === 1) {
          // Regular character input
          currentInput =
            currentInput.substring(0, inputCursor) + ch + currentInput.substring(inputCursor);
          inputCursor++;
        }

        updateDisplay();
      });

      // Save entry when Ctrl+S is pressed
      screen.key('C-s', async () => {
        if ((activeMode === EDITING_MODE || activeMode === INPUT_VIEW) && currentInput.trim()) {
          try {
            // Add new entry
            const newEntry: LogEntry = {
              timestamp: new Date().toISOString(),
              content: currentInput.trim(),
            };

            entries.unshift(newEntry);
            await fs.writeFile(STORAGE_FILE, JSON.stringify(entries, null, 2));

            // Sync with GitHub Gist in the background if configured
            if (await isGistSyncConfigured()) {
              syncWithGistInBackground(entries);
              logger.debug('Started background sync with GitHub Gist from dashboard');
            }

            // Clear input
            currentInput = '';
            inputCursor = 0;

            // Refresh the entries display
            let updatedEntriesContent = '';
            const updatedGroupedEntries = groupEntriesByDate(entries);
            Object.keys(updatedGroupedEntries).forEach((date) => {
              updatedEntriesContent += `  ► ${date}\n\n`;
              updatedGroupedEntries[date].forEach((entry) => {
                const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                updatedEntriesContent += `  [${time}] ${entry.content}\n`;
              });
              updatedEntriesContent += '\n';
            });
            entriesBox.setContent(updatedEntriesContent);

            // Show success message
            const successBox = blessed.message({
              parent: screen,
              top: 'center',
              left: 'center',
              width: '50%',
              height: 5,
              content: 'Entry added successfully!',
              border: {
                type: 'line',
              },
              style: {
                fg: 'green',
                border: {
                  fg: 'green',
                },
              },
            });
            successBox.display('Entry added successfully!', 3, () => {
              // After saving, go back to entries view
              activeMode = ENTRIES_VIEW;
              updateDisplay();
            });
          } catch (error) {
            // Show error message
            const errorBox = blessed.message({
              parent: screen,
              top: 'center',
              left: 'center',
              width: '50%',
              height: 5,
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
              border: {
                type: 'line',
              },
              style: {
                fg: 'red',
                border: {
                  fg: 'red',
                },
              },
            });
            errorBox.display(
              `Error: ${error instanceof Error ? error.message : String(error)}`,
              3,
              () => {
                updateDisplay();
              }
            );
          }
        }
      });

      // Add TAB key for navigation between views (only works in navigation mode)
      screen.key('tab', () => {
        if (activeMode !== EDITING_MODE) {
          // Toggle between ENTRIES_VIEW and INPUT_VIEW
          activeMode = activeMode === ENTRIES_VIEW ? INPUT_VIEW : ENTRIES_VIEW;
          updateDisplay();
        }
      });

      // Initial mode is entries view
      activeMode = ENTRIES_VIEW;
      updateDisplay();
    } catch (error) {
      logger.error(
        `Error displaying dashboard: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  },
};

export default dashboardCommand;
