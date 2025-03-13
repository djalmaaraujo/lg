import fs from 'fs/promises';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { Command, CommandOptions } from '../types/index.js';
import { LogEntry, Storage } from '../types/log.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete, STORAGE_FILE } from './setup.js';
import listCommand from './list.js';

/**
 * Format a date string to display only the date (DD/MM/YYYY)
 * @param dateString ISO date string
 * @returns Formatted date string (DD/MM/YYYY)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

/**
 * Format a date string to display only the time (HH:MM)
 * @param dateString ISO date string
 * @returns Formatted time string (HH:MM)
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Get the date part of an ISO date string (YYYY-MM-DD)
 * @param dateString ISO date string
 * @returns Date part (YYYY-MM-DD)
 */
function getDatePart(dateString: string): string {
  return dateString.split('T')[0];
}

/**
 * Group entries by date
 * @param entries Array of log entries
 * @returns Object with dates as keys and arrays of entries as values
 */
function groupEntriesByDate(entries: LogEntry[]): Record<string, LogEntry[]> {
  const grouped: Record<string, LogEntry[]> = {};

  entries.forEach((entry) => {
    const datePart = getDatePart(entry.timestamp);
    if (!grouped[datePart]) {
      grouped[datePart] = [];
    }
    grouped[datePart].push(entry);
  });

  return grouped;
}

// Define a type for the entry selection choices
type EntryChoice = {
  name: string;
  value: number | 'all' | 'cancel';
};

/**
 * Remove command implementation
 */
const removeCommand: Command = {
  name: 'remove',
  description: 'Remove log entries',
  aliases: ['rm', 'delete'],
  options: [
    {
      flags: '-d, --date',
      description: 'List dates to select entries for removal',
    },
    {
      flags: '-l, --last',
      description: 'Remove the last entry',
    },
  ],

  async execute(_args: string[], options: CommandOptions): Promise<void> {
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
        logger.info('No entries found. Nothing to remove.');
        return;
      }

      // Handle the --last option to remove the last entry
      if (options.last) {
        return await removeLastEntry(entries);
      }

      // Group entries by date
      const groupedEntries = groupEntriesByDate(entries);

      // Get dates and sort them in descending order (newest first)
      const dates = Object.keys(groupedEntries);
      dates.sort((a, b) => b.localeCompare(a));

      // If no options are provided or --date is specified, show date selection
      if (options.date || Object.keys(options).length === 0) {
        // If no options are provided, default to the last day
        if (Object.keys(options).length === 0 && dates.length > 0) {
          const lastDate = dates[0];
          return await handleDateSelection(lastDate, groupedEntries, entries);
        }

        // Create choices for date selection
        const dateChoices = dates.map((date) => ({
          name: `${formatDate(date)} (${groupedEntries[date].length} entries)`,
          value: date,
        }));

        // Add a cancel option
        dateChoices.push({
          name: chalk.blue('Cancel (exit without removing)'),
          value: 'cancel',
        });

        // Otherwise, show date selection
        const { selectedDate } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedDate',
            message: 'Select a date to remove entries from:',
            choices: dateChoices,
          },
        ]);

        // Handle cancel option
        if (selectedDate === 'cancel') {
          logger.info('Operation cancelled.');
          return;
        }

        return await handleDateSelection(selectedDate, groupedEntries, entries);
      }
    } catch (error) {
      logger.error(
        `Error removing entries: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  },
};

/**
 * Handle date selection for entry removal
 * @param selectedDate The selected date
 * @param groupedEntries Entries grouped by date
 * @param allEntries All entries
 */
async function handleDateSelection(
  selectedDate: string,
  groupedEntries: Record<string, LogEntry[]>,
  allEntries: LogEntry[]
): Promise<void> {
  // Get entries for the selected date
  const entriesForDate = groupedEntries[selectedDate];

  // Sort entries by timestamp (newest first)
  entriesForDate.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Create choices for the prompt
  const choices: EntryChoice[] = entriesForDate.map((entry, index) => ({
    name: `${chalk.yellow(`[${formatTime(entry.timestamp)}]`)} ${entry.content}`,
    value: index,
  }));

  // Add an "All" option to delete all entries for the day
  choices.unshift({
    name: chalk.red('All entries for this day'),
    value: 'all',
  });

  // Add a "Cancel" option to exit the command
  choices.push({
    name: chalk.blue('Cancel (exit without removing)'),
    value: 'cancel',
  });

  // Prompt for entry selection
  const { selectedEntry } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedEntry',
      message: `Select an entry to remove from ${formatDate(selectedDate)}:`,
      choices,
    },
  ]);

  // Handle "Cancel" option
  if (selectedEntry === 'cancel') {
    logger.info('Operation cancelled.');
    return;
  }

  // Handle "All" option
  if (selectedEntry === 'all') {
    // Filter out all entries for the selected date
    const updatedEntries = allEntries.filter(
      (entry) => getDatePart(entry.timestamp) !== selectedDate
    );

    // Write the updated entries back to the file
    await fs.writeFile(STORAGE_FILE, JSON.stringify(updatedEntries, null, 2));

    logger.info(
      `${chalk.green('Success:')} Removed all ${entriesForDate.length} entries for ${formatDate(
        selectedDate
      )}`
    );

    // Show the list of entries after removal
    await listCommand.execute([], {});
    return;
  }

  // Remove the selected entry
  const entryToRemove = entriesForDate[selectedEntry];
  const updatedEntries = allEntries.filter((entry) => entry.timestamp !== entryToRemove.timestamp);

  // Write the updated entries back to the file
  await fs.writeFile(STORAGE_FILE, JSON.stringify(updatedEntries, null, 2));

  logger.info(
    `${chalk.green('Success:')} Removed entry: ${chalk.yellow(
      `[${formatTime(entryToRemove.timestamp)}]`
    )} ${entryToRemove.content}`
  );

  // Show the list of entries after removal
  await listCommand.execute([], {});
}

/**
 * Remove the last entry
 * @param entries All entries
 */
async function removeLastEntry(entries: LogEntry[]): Promise<void> {
  // Sort entries by timestamp (newest first)
  entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Get the last entry
  const lastEntry = entries[0];

  // Confirm removal
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to remove the last entry: ${chalk.yellow(
        `[${formatTime(lastEntry.timestamp)}]`
      )} ${lastEntry.content}?`,
      default: false,
    },
  ]);

  if (!confirm) {
    logger.info('Operation cancelled.');
    return;
  }

  // Remove the last entry
  const updatedEntries = entries.slice(1);

  // Write the updated entries back to the file
  await fs.writeFile(STORAGE_FILE, JSON.stringify(updatedEntries, null, 2));

  logger.info(
    `${chalk.green('Success:')} Removed entry: ${chalk.yellow(
      `[${formatTime(lastEntry.timestamp)}]`
    )} ${lastEntry.content}`
  );

  // Show the list of entries after removal
  await listCommand.execute([], {});
}

export default removeCommand;
