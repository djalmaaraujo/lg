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
      line += '{bold}{green-fg}' + day.toString().padStart(2, ' ') + '{/green-fg}{/bold} ';
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
        line += '{bold}{green-fg}' + day.toString().padStart(2, ' ') + '{/green-fg}{/bold} ';
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
          let entryLine = `  [${time}] ${entry.content}`;
          
          // Add edited indicator if the entry has been updated
          if (entry.updated_at) {
            const updatedDate = new Date(entry.updated_at);
            const createdDate = new Date(entry.timestamp);
            
            const updatedTime = updatedDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
            
            // Check if the update was on a different day than creation
            const isSameDay = 
              updatedDate.getFullYear() === createdDate.getFullYear() &&
              updatedDate.getMonth() === createdDate.getMonth() &&
              updatedDate.getDate() === createdDate.getDate();
            
            if (isSameDay) {
              entryLine += ` {yellow-fg}(edited at ${updatedTime}){/yellow-fg}`;
            } else {
              // Include the date in the edit indicator
              const updatedDateStr = updatedDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });
              entryLine += ` {yellow-fg}(edited on ${updatedDateStr} at ${updatedTime}){/yellow-fg}`;
            }
          }
          
          entriesContent += entryLine + '\n';
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
        content: 'Press ENTER to edit, ESC to exit edit mode, Ctrl+S to save, s to select an entry, d/delete to delete',
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
          '{center}Press q to quit, TAB/e/i/s to navigate, ENTER to edit, d/delete to delete, arrow keys to scroll/select{/center}',
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
      const ENTRY_SELECTION_MODE = 3;
      let activeMode = ENTRIES_VIEW;

      // Track input state
      let currentInput = '';
      let inputCursor = 0;
      
      // Track whether we're editing an existing entry or creating a new one
      let isEditingExistingEntry = false;
      let editingEntryIndex = -1;

      // Track entry selection
      let selectedEntryIndex = 0;
      let flatEntries: { entry: LogEntry; dateStr: string }[] = [];

      // Flatten entries for selection
      const flattenEntries = () => {
        flatEntries = [];
        Object.keys(groupedEntries).forEach((dateStr) => {
          groupedEntries[dateStr].forEach((entry) => {
            flatEntries.push({ entry, dateStr });
          });
        });
      };

      // Initial flattening
      flattenEntries();

      // Function to update the display based on active mode
      const updateDisplay = () => {
        // Reset all labels to default
        entriesBox.setLabel(' Recent Entries ');
        tagsBox.setLabel(' Tags ');
        quickEntryBox.setLabel(' Quick Entry ');

        // Reset the entries display when not in selection mode
        if (activeMode !== ENTRY_SELECTION_MODE) {
          // Display entries without selection highlighting
          let entriesContent = '\n';
          Object.keys(groupedEntries).forEach((date) => {
            entriesContent += `  ► ${date}\n\n`;
            groupedEntries[date].forEach((entry) => {
              const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
              let entryLine = `  [${time}] ${entry.content}`;
              
              // Add edited indicator if the entry has been updated
              if (entry.updated_at) {
                const updatedDate = new Date(entry.updated_at);
                const createdDate = new Date(entry.timestamp);
                
                const updatedTime = updatedDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                
                // Check if the update was on a different day than creation
                const isSameDay = 
                  updatedDate.getFullYear() === createdDate.getFullYear() &&
                  updatedDate.getMonth() === createdDate.getMonth() &&
                  updatedDate.getDate() === createdDate.getDate();
                
                if (isSameDay) {
                  entryLine += ` {yellow-fg}(edited at ${updatedTime}){/yellow-fg}`;
                } else {
                  // Include the date in the edit indicator
                  const updatedDateStr = updatedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  });
                  entryLine += ` {yellow-fg}(edited on ${updatedDateStr} at ${updatedTime}){/yellow-fg}`;
                }
              }
              
              entriesContent += entryLine + '\n';
            });
            entriesContent += '\n';
          });
          entriesBox.setContent(entriesContent || '\n  No entries found.');
        }

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
        } else if (activeMode === ENTRY_SELECTION_MODE) {
          entriesBox.setLabel(' \u001b[32m[SELECT] Recent Entries\u001b[0m ');
          
          // Update entries content with selection highlight
          let entriesContent = '\n';
          Object.keys(groupedEntries).forEach((date) => {
            entriesContent += `  ► ${date}\n\n`;
            groupedEntries[date].forEach((entry) => {
              const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
              let entryLine = `  [${time}] ${entry.content}`;
              
              // Add edited indicator if the entry has been updated
              if (entry.updated_at) {
                const updatedDate = new Date(entry.updated_at);
                const createdDate = new Date(entry.timestamp);
                
                const updatedTime = updatedDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                
                // Check if the update was on a different day than creation
                const isSameDay = 
                  updatedDate.getFullYear() === createdDate.getFullYear() &&
                  updatedDate.getMonth() === createdDate.getMonth() &&
                  updatedDate.getDate() === createdDate.getDate();
                
                if (isSameDay) {
                  entryLine += ` {yellow-fg}(edited at ${updatedTime}){/yellow-fg}`;
                } else {
                  // Include the date in the edit indicator
                  const updatedDateStr = updatedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  });
                  entryLine += ` {yellow-fg}(edited on ${updatedDateStr} at ${updatedTime}){/yellow-fg}`;
                }
              }
              
              if (flatEntries.findIndex((e) => e.entry.timestamp === entry.timestamp) === selectedEntryIndex) {
                // Create a clean version of the line without the leading spaces for highlighting
                const cleanLine = entryLine.trim();
                entriesContent += `  {inverse}${cleanLine}{/inverse}\n`;
              } else {
                entriesContent += entryLine + '\n';
              }
            });
            entriesContent += '\n';
          });
          
          entriesBox.setContent(entriesContent);
          entriesBox.focus();
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
          currentInput = '';
          inputCursor = 0;
          // Mark that we're creating a new entry
          isEditingExistingEntry = false;
          editingEntryIndex = -1;
          updateDisplay();
        }
      });

      // Direct key for entry selection mode
      screen.key('s', () => {
        if (activeMode !== EDITING_MODE && flatEntries.length > 0) {
          activeMode = ENTRY_SELECTION_MODE;
          selectedEntryIndex = 0;
          updateDisplay();
        }
      });

      // Handle escape and q to exit
      screen.key(['escape', 'q', 'C-c'], (_, key) => {
        // If in editing mode, exit to input view or selection mode depending on context
        if (activeMode === EDITING_MODE && key.name === 'escape') {
          if (isEditingExistingEntry) {
            // If editing an existing entry, return to selection mode
            activeMode = ENTRY_SELECTION_MODE;
          } else {
            // If creating a new entry, return to input view
            activeMode = INPUT_VIEW;
            // Clear the input when exiting edit mode without saving
            currentInput = '';
            inputCursor = 0;
          }
          updateDisplay();
          return;
        }
        
        // If in editing mode and 'q' is pressed, treat it as a regular character input
        if (activeMode === EDITING_MODE && key.name === 'q') {
          // Add 'q' to the input at cursor position
          currentInput = 
            currentInput.substring(0, inputCursor) + 'q' + currentInput.substring(inputCursor);
          inputCursor++;
          updateDisplay();
          return;
        }

        // If in input view, exit to entries view on Escape
        if (activeMode === INPUT_VIEW && key.name === 'escape') {
          activeMode = ENTRIES_VIEW;
          // Clear the input when exiting input view
          currentInput = '';
          inputCursor = 0;
          updateDisplay();
          return;
        }
        
        // If in entry selection mode, exit to entries view
        if (activeMode === ENTRY_SELECTION_MODE && key.name === 'escape') {
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
          currentInput = '';
          inputCursor = 0;
          // Mark that we're creating a new entry
          isEditingExistingEntry = false;
          editingEntryIndex = -1;
          updateDisplay();
        } else if (activeMode === INPUT_VIEW) {
          // From input view, enter editing mode
          activeMode = EDITING_MODE;
          // Still creating a new entry
          isEditingExistingEntry = false;
          editingEntryIndex = -1;
          updateDisplay();
        } else if (activeMode === EDITING_MODE) {
          // In editing mode, Enter adds a newline
          currentInput += '\n';
          inputCursor = currentInput.length;
          updateDisplay();
        } else if (activeMode === ENTRY_SELECTION_MODE && selectedEntryIndex < flatEntries.length) {
          // In selection mode, Enter selects the entry for editing
          const selectedEntry = flatEntries[selectedEntryIndex].entry;
          currentInput = selectedEntry.content;
          inputCursor = currentInput.length;
          // Mark that we're editing an existing entry
          isEditingExistingEntry = true;
          editingEntryIndex = entries.findIndex(e => e.timestamp === selectedEntry.timestamp);
          activeMode = EDITING_MODE;
          updateDisplay();
        }
      });

      // Handle navigation in entry selection mode
      screen.key(['up', 'down'], (_, key) => {
        if (activeMode === ENTRY_SELECTION_MODE) {
          if (key.name === 'up' && selectedEntryIndex > 0) {
            selectedEntryIndex--;
          } else if (key.name === 'down' && selectedEntryIndex < flatEntries.length - 1) {
            selectedEntryIndex++;
          }
          updateDisplay();
        }
      });
      
      // Create a custom question box that properly positions buttons
      function createCustomConfirmDialog(options: any) {
        // Define our extended box interface
        interface CustomBox extends blessed.Widgets.BoxElement {
          setMessage: (text: string) => void;
          ask: (text: string, callback: (err: Error | null, result: boolean) => void) => void;
        }
        
        // Create the base box with proper typing
        const box = blessed.box({
          ...options,
          tags: true,
          // Add more padding for better appearance
          padding: {
            top: 2,
            bottom: 2,
            left: 3,
            right: 3
          },
          // Ensure the box captures all input
          input: true,
          keys: true,
          mouse: true,
          // Set a high z-index to ensure it's above other elements
          zIndex: 100
        }) as CustomBox;
        
        const message = blessed.text({
          parent: box,
          top: 0,
          left: 0,
          right: 0,
          height: options.height - 4,
          content: options.content || '',
          tags: true,
          wrap: true
        });
        
        // Create buttons with proper typing
        const okButton = blessed.button({
          parent: box,
          bottom: 1,
          left: '25%-8',
          width: 8,
          height: 1,
          content: ' {bold}Okay{/bold} ',
          align: 'center',
          valign: 'middle',
          mouse: true,
          keys: true,
          padding: {
            left: 1,
            right: 1
          },
          style: {
            bg: 'green',
            focus: {
              bg: 'brightgreen'
            },
            hover: {
              bg: 'brightgreen'
            }
          },
          tags: true
        });
        
        const cancelButton = blessed.button({
          parent: box,
          bottom: 1,
          left: '75%-10',
          width: 10,
          height: 1,
          content: ' {bold}Cancel{/bold} ',
          align: 'center',
          valign: 'middle',
          mouse: true,
          keys: true,
          padding: {
            left: 1,
            right: 1
          },
          style: {
            bg: 'red',
            focus: {
              bg: 'brightred'
            },
            hover: {
              bg: 'brightred'
            }
          },
          tags: true
        });
        
        // Add the setMessage method to the box
        box.setMessage = (text: string) => {
          message.setContent(text);
        };
        
        // Add the ask method to the box
        box.ask = (text: string, callback: (err: Error | null, result: boolean) => void) => {
          let answered = false;
          // Track which button is focused
          let isOkButtonFocused = true;
          
          box.setMessage(text);
          box.show();
          
          const done = (result: boolean) => {
            if (answered) return;
            answered = true;
            box.hide();
            callback(null, result);
          };
          
          okButton.on('press', () => done(true));
          cancelButton.on('press', () => done(false));
          
          // Handle keyboard navigation between buttons
          okButton.key(['tab', 'right'], () => {
            cancelButton.focus();
            isOkButtonFocused = false;
          });
          
          cancelButton.key(['tab', 'right'], () => {
            okButton.focus();
            isOkButtonFocused = true;
          });
          
          okButton.key(['shift-tab', 'left'], () => {
            cancelButton.focus();
            isOkButtonFocused = false;
          });
          
          cancelButton.key(['shift-tab', 'left'], () => {
            okButton.focus();
            isOkButtonFocused = true;
          });
          
          // Handle escape key
          box.key('escape', () => done(false));
          
          // Handle enter key
          box.key('enter', () => {
            if (isOkButtonFocused) {
              done(true);
            } else {
              done(false);
            }
          });
          
          // Initial focus
          okButton.focus();
        };
        
        return box;
      }

      // Handle delete key in entry selection mode
      screen.key(['delete', 'd'], () => {
        if (activeMode === ENTRY_SELECTION_MODE && selectedEntryIndex < flatEntries.length) {
          // Store current selection state
          const currentSelectedIndex = selectedEntryIndex;
          
          // Temporarily disable keyboard input for other elements
          const originalKeypress = screen.listeners('keypress');
          screen.removeAllListeners('keypress');
          
          // Show confirmation dialog
          const confirmBox = createCustomConfirmDialog({
            parent: screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: 12,
            border: {
              type: 'line',
            },
            style: {
              fg: 'white',
              border: {
                fg: 'red',
              },
            }
          });
          
          const selectedEntry = flatEntries[selectedEntryIndex].entry;
          const entryPreview = selectedEntry.content.length > 30 
            ? selectedEntry.content.substring(0, 30) + '...' 
            : selectedEntry.content;
            
          // Create a special keypress handler for the confirmation dialog
          // that prevents arrow keys from affecting the underlying UI
          const confirmationKeyHandler = (_ch: string, key: blessed.Widgets.Events.IKeyEventArg) => {
            // Only allow specific keys for the confirmation dialog
            // Block all other keys from affecting the underlying UI
            if (key.name === 'escape' || 
                key.name === 'return' || 
                key.name === 'enter' ||
                key.name === 'tab' ||
                key.name === 'left' ||
                key.name === 'right') {
              // Let these keys be handled by the dialog
              return true;
            }
            
            // Block all other keys from propagating
            return false;
          };
          
          // Add the key handler
          screen.on('keypress', confirmationKeyHandler);
          
          // Force focus on the confirmation box
          confirmBox.focus();
          screen.render();
            
          confirmBox.ask(`Are you sure you want to delete this entry?\n\n"${entryPreview}"`, async (err: Error | null, confirmed: boolean) => {
            // Remove our special key handler
            screen.removeListener('keypress', confirmationKeyHandler);
            
            // Restore original keypress handlers
            screen.removeAllListeners('keypress');
            originalKeypress.forEach(handler => {
              screen.on('keypress', handler as (...args: any[]) => void);
            });
            
            if (err) return;
            
            if (confirmed) {
              try {
                // Find the entry in the original entries array
                const deletedEntryIndex = entries.findIndex(e => e.timestamp === selectedEntry.timestamp);
                
                if (deletedEntryIndex !== -1) {
                  // IMPORTANT: Clear the Quick Entry panel BEFORE deleting the entry
                  // This prevents the deleted content from appearing in the input box
                  currentInput = '';
                  inputCursor = 0;
                  
                  // Remove the entry
                  entries.splice(deletedEntryIndex, 1);
                  
                  // Write the updated entries back to the file
                  await fs.writeFile(STORAGE_FILE, JSON.stringify(entries, null, 2));
                  
                  // Sync with GitHub Gist in the background if configured
                  if (await isGistSyncConfigured()) {
                    syncWithGistInBackground(entries);
                    logger.debug('Started background sync with GitHub Gist from dashboard');
                  }
                  
                  // Refresh the entries display
                  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  const updatedGroupedEntries = groupEntriesByDate(entries);
                  
                  // Update grouped entries and flatten
                  Object.keys(groupedEntries).forEach(key => {
                    delete groupedEntries[key];
                  });
                  
                  Object.keys(updatedGroupedEntries).forEach(key => {
                    groupedEntries[key] = updatedGroupedEntries[key];
                  });
                  
                  flattenEntries();
                  
                  // Adjust selected index if needed
                  if (selectedEntryIndex >= flatEntries.length && flatEntries.length > 0) {
                    selectedEntryIndex = flatEntries.length - 1;
                  }
                  
                  // Show success message
                  const successBox = blessed.message({
                    parent: screen,
                    top: 'center',
                    left: 'center',
                    width: '50%',
                    height: 5,
                    content: 'Entry deleted successfully!',
                    border: {
                      type: 'line',
                    },
                    style: {
                      fg: 'green',
                      border: {
                        fg: 'green',
                      },
                    },
                    keys: true,
                    mouse: true,
                    padding: {
                      top: 1,
                      bottom: 1,
                      left: 2,
                      right: 2
                    }
                  });
                  
                  // Temporarily disable keyboard input for other elements
                  const successKeypress = screen.listeners('keypress');
                  screen.removeAllListeners('keypress');
                  
                  // Add a single keypress handler that only responds to the success box
                  screen.on('keypress', () => {
                    // Close the message box immediately on any key press
                    successBox.hide();
                    // After the message is closed, restore keyboard handlers
                    screen.removeAllListeners('keypress');
                    successKeypress.forEach(listener => {
                      screen.on('keypress', listener as (...args: any[]) => void);
                    });
                    
                    if (flatEntries.length === 0) {
                      // If no entries left, go back to entries view
                      activeMode = ENTRIES_VIEW;
                    } else {
                      // Stay in selection mode
                      activeMode = ENTRY_SELECTION_MODE;
                    }
                    updateDisplay();
                  });
                  
                  successBox.display('Entry deleted successfully!', 3, () => {
                    // This will only run if the timeout expires without a key press
                    // After the message is closed, restore keyboard handlers
                    screen.removeAllListeners('keypress');
                    successKeypress.forEach(listener => {
                      screen.on('keypress', listener as (...args: any[]) => void);
                    });
                    
                    if (flatEntries.length === 0) {
                      // If no entries left, go back to entries view
                      activeMode = ENTRIES_VIEW;
                    } else {
                      // Stay in selection mode
                      activeMode = ENTRY_SELECTION_MODE;
                    }
                    updateDisplay();
                  });
                  
                  // Focus the success box to capture keyboard input
                  successBox.focus();
                  screen.render();
                }
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
                    // Stay in selection mode
                    activeMode = ENTRY_SELECTION_MODE;
                    updateDisplay();
                  }
                );
              }
            } else {
              // User canceled, stay in selection mode
              activeMode = ENTRY_SELECTION_MODE;
              selectedEntryIndex = currentSelectedIndex;
              updateDisplay();
            }
          });
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
            if (isEditingExistingEntry && editingEntryIndex !== -1) {
              // Update existing entry
              entries[editingEntryIndex].content = currentInput.trim();
              entries[editingEntryIndex].updated_at = new Date().toISOString();
            } else {
              // Add new entry
              const newEntry: LogEntry = {
                timestamp: new Date().toISOString(),
                content: currentInput.trim(),
                updated_at: null
              };
              entries.unshift(newEntry);
            }
            
            await fs.writeFile(STORAGE_FILE, JSON.stringify(entries, null, 2));

            // Sync with GitHub Gist in the background if configured
            if (await isGistSyncConfigured()) {
              syncWithGistInBackground(entries);
              logger.debug('Started background sync with GitHub Gist from dashboard');
            }

            // Clear input
            currentInput = '';
            inputCursor = 0;
            
            // Reset selection state
            selectedEntryIndex = 0;
            isEditingExistingEntry = false;
            editingEntryIndex = -1;
            
            // Refresh the entries display
            entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const updatedGroupedEntries = groupEntriesByDate(entries);
            
            // Update grouped entries and flatten
            Object.keys(groupedEntries).forEach(key => {
              delete groupedEntries[key];
            });
            
            Object.keys(updatedGroupedEntries).forEach(key => {
              groupedEntries[key] = updatedGroupedEntries[key];
            });
            
            flattenEntries();
            
            // Update the entries display with the latest data
            let updatedEntriesContent = '';
            Object.keys(updatedGroupedEntries).forEach((date) => {
              updatedEntriesContent += `  ► ${date}\n\n`;
              updatedGroupedEntries[date].forEach((entry) => {
                const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                let entryLine = `  [${time}] ${entry.content}`;
                
                // Add edited indicator if the entry has been updated
                if (entry.updated_at) {
                  const updatedDate = new Date(entry.updated_at);
                  const createdDate = new Date(entry.timestamp);
                  
                  const updatedTime = updatedDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  
                  // Check if the update was on a different day than creation
                  const isSameDay = 
                    updatedDate.getFullYear() === createdDate.getFullYear() &&
                    updatedDate.getMonth() === createdDate.getMonth() &&
                    updatedDate.getDate() === createdDate.getDate();
                  
                  if (isSameDay) {
                    entryLine += ` {yellow-fg}(edited at ${updatedTime}){/yellow-fg}`;
                  } else {
                    // Include the date in the edit indicator
                    const updatedDateStr = updatedDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    });
                    entryLine += ` {yellow-fg}(edited on ${updatedDateStr} at ${updatedTime}){/yellow-fg}`;
                  }
                }
                
                updatedEntriesContent += entryLine + '\n';
              });
              updatedEntriesContent += '\n';
            });
            entriesBox.setContent(updatedEntriesContent);
            
            // Update flattened entries with the updated grouped entries
            flattenEntries();

            // Show success message
            const successBox = blessed.message({
              parent: screen,
              top: 'center',
              left: 'center',
              width: '50%',
              height: 5,
              content: isEditingExistingEntry ? 'Entry updated successfully!' : 'Entry added successfully!',
              border: {
                type: 'line',
              },
              style: {
                fg: 'green',
                border: {
                  fg: 'green',
                },
              },
              keys: true,
              mouse: true,
              padding: {
                top: 1,
                bottom: 1,
                left: 2,
                right: 2
              }
            });
            
            // Temporarily disable keyboard input for other elements
            const originalKeypress = screen.listeners('keypress');
            screen.removeAllListeners('keypress');
            
            // Add a single keypress handler that only responds to the success box
            // and dismisses the message on any key press
            screen.on('keypress', () => {
              // Close the message box immediately on any key press
              successBox.hide();
              // After the message is closed, restore keyboard handlers
              screen.removeAllListeners('keypress');
              originalKeypress.forEach(listener => {
                screen.on('keypress', listener as (...args: any[]) => void);
              });
              
              // After saving, go back to entries view
              activeMode = ENTRIES_VIEW;
              updateDisplay();
              
              // Update the calendar to reflect new entries
              const calendarBox = screen.children.find(
                (child) => (child as blessed.Widgets.BoxElement).options.label === ' Calendar '
              ) as blessed.Widgets.BoxElement;
              
              if (calendarBox) {
                calendarBox.setContent(generateCalendar(entries));
                screen.render();
              }
            });
            
            const successMessage = isEditingExistingEntry 
              ? 'Entry updated successfully! Edit timestamp has been recorded.' 
              : 'New entry added successfully!';
              
            successBox.display(successMessage, 3, () => {
              // This will only run if the timeout expires without a key press
              // After the message is closed, restore keyboard handlers
              screen.removeAllListeners('keypress');
              originalKeypress.forEach(listener => {
                screen.on('keypress', listener as (...args: any[]) => void);
              });
            });
            
            // Focus the success box to capture keyboard input
            successBox.focus();
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
          if (activeMode === ENTRIES_VIEW) {
            activeMode = INPUT_VIEW;
            currentInput = '';
            inputCursor = 0;
            // Mark that we're creating a new entry
            isEditingExistingEntry = false;
            editingEntryIndex = -1;
          } else {
            activeMode = ENTRIES_VIEW;
          }
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
