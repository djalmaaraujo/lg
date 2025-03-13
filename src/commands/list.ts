// src/commands/list.ts
import fs from 'fs/promises';
import chalk from 'chalk';
import { Command, CommandOptions } from '../types/index.js';
import { Storage } from '../types/log.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete, STORAGE_FILE } from './setup.js';

/**
 * Format a date string to a more readable format
 * @param dateString ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
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
      description: 'Limit the number of entries to display',
    },
    {
      flags: '-r, --reverse',
      description: 'Display entries in reverse order (oldest first)',
    }
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
      
      // Sort entries by timestamp (newest first by default)
      entries.sort((a, b) => {
        return options.reverse 
          ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      // Apply limit if specified
      if (options.limit) {
        const limit = parseInt(options.limit as string, 10);
        if (!isNaN(limit) && limit > 0) {
          entries = entries.slice(0, limit);
        }
      }
      
      // Display entries
      console.log(chalk.bold('\nLife Log Entries:'));
      console.log(chalk.dim('─'.repeat(50)));
      
      entries.forEach((entry, index) => {
        console.log(chalk.blue(`[${formatDate(entry.timestamp)}]`));
        console.log(entry.content);
        if (index < entries.length - 1) {
          console.log(chalk.dim('─'.repeat(50)));
        }
      });
      
      console.log(chalk.dim('─'.repeat(50)));
      console.log(`Total entries: ${chalk.green(entries.length)}`);
    } catch (error) {
      logger.error(`Error listing entries: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
};

export default listCommand; 