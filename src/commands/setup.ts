import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { Command, CommandOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Path to the lg directory in the user's home directory
 */
export const LG_DIR = path.join(homedir(), '.lg');

/**
 * Path to the storage file
 */
export const STORAGE_FILE = path.join(LG_DIR, 'storage.json');

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
      if (await isSetupComplete()) {
        logger.info('lg is already set up and ready to use.');
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
      logger.info('Try: lg "Your first life log entry"');
    } catch (error) {
      logger.error(`Failed to set up lg: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
};

export default setupCommand; 