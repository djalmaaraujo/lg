// src/commands/list.ts
import fs from 'fs/promises';
import chalk from 'chalk';
import { Command, CommandOptions } from '../types/index.js';
import { LogEntry, Storage } from '../types/log.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete, STORAGE_FILE } from './setup.js';
import {
  syncWithGistInBackground,
  performFullSync,
  isGistSyncConfigured,
} from '../utils/gistSync.js';

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
 * Format a date string to display only the date (DD/MM/YYYY)
 * @param dateString ISO date string
 * @returns Formatted date string (DD/MM/YYYY)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
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

/**
 * List command implementation
 */
const listCommand: Command = {
  name: 'list',
  description: 'List all logged entries',
  aliases: ['ls', 'history'],
  options: [
    {
      flags: '-n, --limit <number>',
      description: 'Limit the number of days to display',
    },
    {
      flags: '-r, --reverse',
      description: 'Display entries in reverse order (newest first)',
    },
    {
      flags: '-s, --sync',
      description: 'Perform a full sync with remote storage before listing entries',
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
      let entries: Storage = JSON.parse(data);

      if (entries.length === 0) {
        logger.info('No entries found. Start logging with: lg "Your message here"');
        return;
      }

      // If sync option is specified and gist sync is configured, perform a full sync
      if (options.sync && (await isGistSyncConfigured())) {
        logger.info('Syncing with remote storage...');
        entries = await performFullSync(entries);

        // Save the updated entries back to the file
        await fs.writeFile(STORAGE_FILE, JSON.stringify(entries, null, 2));
        logger.info('Sync complete.');
      } else {
        // Otherwise, trigger a background sync
        if (await isGistSyncConfigured()) {
          syncWithGistInBackground(entries);
        }
      }

      // Group entries by date
      const groupedEntries = groupEntriesByDate(entries);

      // Get dates and sort them
      // By default, sort dates in ascending order (oldest first)
      // If reverse option is specified, sort in descending order (newest first)
      let dates = Object.keys(groupedEntries);
      dates.sort((a, b) => {
        return options.reverse ? b.localeCompare(a) : a.localeCompare(b);
      });

      // Apply limit if specified
      if (options.limit) {
        const limit = parseInt(options.limit as string, 10);
        if (!isNaN(limit) && limit > 0) {
          dates = dates.slice(0, limit);
        }
      }

      // Display entries grouped by date
      console.log(chalk.bold('\nLife Log Entries:'));

      let totalEntries = 0;

      dates.forEach((date) => {
        const entriesForDate = groupedEntries[date];

        // Always sort entries within the day in ascending order (oldest first)
        // This makes the most recent entries appear at the bottom in the terminal
        entriesForDate.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        // Display date header
        console.log(chalk.bgBlue.white.bold(` ${formatDate(date)} `));

        // Display entries for this date
        entriesForDate.forEach((entry) => {
          // Format each entry on a single line: [time] content
          console.log(`${chalk.yellow(`[${formatTime(entry.timestamp)}]`)} ${entry.content}`);
        });

        console.log(); // Add an empty line after each day's entries
        totalEntries += entriesForDate.length;
      });

      console.log(
        `Total entries: ${chalk.green(totalEntries)} across ${chalk.green(dates.length)} days`
      );
    } catch (error) {
      logger.error(
        `Error listing entries: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  },
};

export default listCommand;
