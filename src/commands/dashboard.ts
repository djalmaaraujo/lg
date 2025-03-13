import fs from 'fs/promises';
import { Command, CommandOptions } from '../types/index.js';
import { LogEntry, Storage } from '../types/log.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete, STORAGE_FILE } from './setup.js';
import blessed from 'blessed';

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
        keys: true,
        vi: true,
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
      let entriesContent = '';
      Object.keys(groupedEntries).forEach((date) => {
        // Display date without ** ** formatting, but keep it visually distinct
        entriesContent += `${date}\n\n`;
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
        style: {
          fg: 'white',
          border: {
            fg: 'white',
          },
        },
      });

      // Create a text input for quick entry
      const quickEntryInput = blessed.textbox({
        parent: quickEntryBox,
        top: 0,
        left: 0,
        height: 3,
        width: '100%',
        keys: true,
        mouse: true,
        inputOnFocus: true,
        style: {
          fg: 'white',
          focus: {
            fg: 'blue',
          },
        },
      });

      // Create a help text
      blessed.text({
        parent: quickEntryBox,
        content: 'Press Enter to focus input, Esc to blur, Ctrl+S to save entry',
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
        content: '{center}Press q to quit, arrow keys to navigate{/center}',
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

      // Handle key events
      screen.key(['escape', 'q', 'C-c'], () => {
        // Ensure proper cleanup before exiting
        screen.destroy();
        isScreenDestroyed = true;
        return process.exit(0);
      });

      // Focus on input when Enter is pressed
      screen.key('enter', () => {
        quickEntryInput.focus();
      });

      // Save entry when Ctrl+S is pressed
      screen.key('C-s', async () => {
        const content = quickEntryInput.getValue();
        if (content.trim()) {
          try {
            // Add new entry
            const newEntry: LogEntry = {
              timestamp: new Date().toISOString(),
              content: content.trim(),
            };

            entries.unshift(newEntry);
            await fs.writeFile(STORAGE_FILE, JSON.stringify(entries, null, 2));

            // Update UI
            quickEntryInput.clearValue();

            // Refresh the entries display - using the same simple formatting approach
            let updatedEntriesContent = '';
            const updatedGroupedEntries = groupEntriesByDate(entries);
            Object.keys(updatedGroupedEntries).forEach((date) => {
              updatedEntriesContent += `${date}\n\n`;
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

            screen.render();

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
              screen.render();
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
                screen.render();
              }
            );
          }
        }
      });

      // Add navigation between panels with arrow keys
      screen.key(['up', 'down', 'left', 'right'], (_, key) => {
        const currentFocus = screen.focused;

        if (key.name === 'left') {
          if (currentFocus === entriesBox) {
            tagsBox.focus();
          } else if (currentFocus === quickEntryInput) {
            entriesBox.focus();
          }
        } else if (key.name === 'right') {
          if (currentFocus === tagsBox) {
            entriesBox.focus();
          }
        } else if (key.name === 'up') {
          if (currentFocus === quickEntryInput) {
            entriesBox.focus();
          }
        } else if (key.name === 'down') {
          if (currentFocus === entriesBox || currentFocus === tagsBox) {
            quickEntryInput.focus();
          }
        }

        screen.render();
      });

      // Render the screen
      screen.render();

      // Focus on the entries box by default
      entriesBox.focus();
    } catch (error) {
      logger.error(
        `Error displaying dashboard: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  },
};

export default dashboardCommand;
