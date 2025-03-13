import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { Command, CommandOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import readline from 'readline';
import { initializeGistSync } from '../utils/gistSync.js';

/**
 * Path to the lg directory in the user's home directory
 */
export const LG_DIR = path.join(homedir(), '.lg');

/**
 * Path to the storage file
 */
export const STORAGE_FILE = path.join(LG_DIR, 'storage.json');

/**
 * Create a readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask a yes/no question
 * @param rl Readline interface
 * @param question Question to ask
 * @returns Promise that resolves to true if the answer is yes, false otherwise
 */
async function askYesNo(rl: readline.Interface, question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

/**
 * Ask for a string input
 * @param rl Readline interface
 * @param question Question to ask
 * @returns Promise that resolves to the user's input
 */
async function askForInput(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${question}: `, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Check if the lg directory and storage file exist
 * @returns Promise that resolves to true if the setup is complete, false otherwise
 */
export async function isSetupComplete(): Promise<boolean> {
  try {
    await fs.access(STORAGE_FILE);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Setup command implementation
 */
const setupCommand: Command = {
  name: 'setup',
  description: 'Initialize the lg CLI',

  async execute(_args: string[], _options: CommandOptions): Promise<void> {
    try {
      // Check if already set up
      const alreadySetup = await isSetupComplete();
      if (alreadySetup) {
        logger.info('lg is already set up and ready to use.');

        // Ask if they want to configure GitHub Gist sync
        const rl = createReadlineInterface();
        const setupGistSync = await askYesNo(
          rl,
          'Would you like to set up GitHub Gist synchronization for your logs?'
        );

        if (!setupGistSync) {
          rl.close();
          return;
        }

        await configureGistSync(rl);
        rl.close();
        return;
      }

      // Create the lg directory if it doesn't exist
      try {
        await fs.mkdir(LG_DIR, { recursive: true });
        logger.debug(`Created directory: ${LG_DIR}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
      }

      // Create the storage file with an empty array
      await fs.writeFile(STORAGE_FILE, JSON.stringify([], null, 2));

      logger.info('lg setup complete! You can now start logging your life.');

      // Ask if they want to configure GitHub Gist sync
      const rl = createReadlineInterface();
      const setupGistSync = await askYesNo(
        rl,
        'Would you like to set up GitHub Gist synchronization for your logs?'
      );

      if (setupGistSync) {
        await configureGistSync(rl);
      } else {
        logger.info('You can set up GitHub Gist sync later by running "lg setup" again.');
      }

      rl.close();
      logger.info('Try: lg "Your first life log entry"');
    } catch (error) {
      logger.error(
        `Failed to set up lg: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  },
};

/**
 * Configure GitHub Gist synchronization
 * @param rl Readline interface
 */
async function configureGistSync(rl: readline.Interface): Promise<void> {
  try {
    logger.info('Setting up GitHub Gist synchronization...');
    logger.info('This will allow you to sync your logs across multiple devices.');
    logger.info('You need a GitHub Personal Access Token with the "gist" scope.');
    logger.info('You can create one at: https://github.com/settings/tokens');

    const token = await askForInput(rl, 'Enter your GitHub Personal Access Token');

    if (!token) {
      logger.error('Token cannot be empty. Gist sync setup aborted.');
      return;
    }

    logger.info('Initializing GitHub Gist sync...');

    // Read the current entries
    let entries = [];
    try {
      const data = await fs.readFile(STORAGE_FILE, 'utf-8');
      entries = JSON.parse(data);
    } catch (error) {
      logger.error(
        `Failed to read storage file: ${error instanceof Error ? error.message : String(error)}`
      );
      entries = [];
    }

    // Initialize gist sync
    const result = await initializeGistSync(token, entries);

    // If the entries were updated (e.g., remote had entries but local was empty),
    // update the local storage file
    if (result.entries !== entries) {
      await fs.writeFile(STORAGE_FILE, JSON.stringify(result.entries, null, 2));
      logger.info(`Imported ${result.entries.length} entries from GitHub Gist.`);
    }

    logger.info('GitHub Gist synchronization set up successfully!');
    logger.info(`Your logs will be synced with Gist ID: ${result.gistId}`);
    logger.info('You can view your gist at: https://gist.github.com/');
  } catch (error) {
    logger.error(
      `Failed to set up GitHub Gist sync: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export default setupCommand;
