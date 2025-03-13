import fs from 'fs/promises';
import { Command, CommandOptions } from '../types/index.js';
import { LogEntry, Storage } from '../types/log.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete, STORAGE_FILE } from './setup.js';
import listCommand from './list.js';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { syncWithGistInBackground, isGistSyncConfigured } from '../utils/gistSync.js';

/**
 * Add a log entry to the storage file
 * @param content Content of the log entry
 * @param customDate Optional custom date for the entry (for testing)
 * @returns Promise that resolves when the entry is added
 */
async function addLogEntry(content: string, customDate?: string): Promise<void> {
  try {
    // Read the current entries
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    const entries: Storage = JSON.parse(data);

    // Create a new entry
    const newEntry: LogEntry = {
      timestamp: customDate ? new Date(customDate).toISOString() : new Date().toISOString(),
      content,
    };

    // Add the new entry
    entries.push(newEntry);

    // Write the updated entries back to the file
    await fs.writeFile(STORAGE_FILE, JSON.stringify(entries, null, 2));

    // Sync with GitHub Gist in the background if configured
    if (await isGistSyncConfigured()) {
      // This will return immediately and sync in the background
      syncWithGistInBackground(entries);
      logger.debug('Started background sync with GitHub Gist');
    }

    logger.info('Entry logged successfully.');

    // Show the list of entries after adding a new entry
    await listCommand.execute([], {});
  } catch (error) {
    logger.error(
      `Failed to add log entry: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Log command implementation
 */
const logCommand: Command = {
  name: 'log',
  description: 'Log a life entry',
  aliases: ['add'],
  options: [
    {
      flags: '--date <date>',
      description: 'Custom date for the entry (YYYY-MM-DD format, for testing)',
    },
  ],

  async execute(args: string[], options: CommandOptions): Promise<void> {
    try {
      // Check if setup is complete
      if (!(await isSetupComplete())) {
        logger.error('lg is not set up yet. Please run "lg setup" first.');
        return;
      }

      // Get the content from arguments
      let content = args.join(' ').trim();

      // If no content is provided, prompt for it interactively
      if (!content) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'content',
            message: 'Enter your log entry:',
            validate: (input) => {
              if (input.trim() === '') {
                return 'Entry cannot be empty';
              }
              return true;
            },
          },
        ]);

        content = answers.content.trim();

        if (!content) {
          logger.error('Log entry cannot be empty.');
          return;
        }
      }

      // Check if the content might contain special characters that need quotes
      const specialChars = [
        '#',
        '!',
        '&',
        '|',
        ';',
        '<',
        '>',
        '(',
        ')',
        '{',
        '}',
        '[',
        ']',
        '$',
        '`',
        '\\',
      ];
      const mightHaveSpecialChars = specialChars.some((char) => content.includes(char));

      if (mightHaveSpecialChars && args.length > 0) {
        logger.info(
          chalk.yellow(
            "Tip: Your entry contains special characters. If you're missing part of your text, try using quotes:"
          )
        );
        logger.info(chalk.cyan(`lg log "${content}"`));
        logger.info(
          chalk.green(
            "Or simply run 'lg' without arguments to use the interactive prompt, which handles special characters automatically."
          )
        );
      }

      // Add the log entry with optional custom date
      await addLogEntry(content, options.date as string | undefined);
    } catch (error) {
      logger.error(
        `Error logging entry: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  },
};

export default logCommand;
