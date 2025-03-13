import fs from 'fs/promises';
import { Command, CommandOptions } from '../types/index.js';
import { LogEntry, Storage } from '../types/log.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete, STORAGE_FILE } from './setup.js';

/**
 * Add a log entry to the storage file
 * @param content Content of the log entry
 * @returns Promise that resolves when the entry is added
 */
async function addLogEntry(content: string): Promise<void> {
  try {
    // Read the current entries
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    const entries: Storage = JSON.parse(data);
    
    // Create a new entry
    const newEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      content
    };
    
    // Add the new entry
    entries.push(newEntry);
    
    // Write the updated entries back to the file
    await fs.writeFile(STORAGE_FILE, JSON.stringify(entries, null, 2));
    
    logger.info('Entry logged successfully.');
  } catch (error) {
    logger.error(`Failed to add log entry: ${error instanceof Error ? error.message : String(error)}`);
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
  
  async execute(args: string[], _options: CommandOptions): Promise<void> {
    try {
      // Check if setup is complete
      if (!(await isSetupComplete())) {
        logger.error('lg is not set up yet. Please run "lg setup" first.');
        return;
      }
      
      // Get the content from arguments
      const content = args.join(' ').trim();
      
      if (!content) {
        logger.error('Please provide a message to log.');
        logger.info('Usage: lg log "Your message here"');
        return;
      }
      
      // Add the log entry
      await addLogEntry(content);
    } catch (error) {
      logger.error(`Error logging entry: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
};

export default logCommand; 