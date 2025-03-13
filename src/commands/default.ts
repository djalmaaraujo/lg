import { Command, CommandOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete } from './setup.js';
import logCommand from './log.js';

/**
 * Default command implementation
 * This command is executed when no command is specified
 * It forwards the arguments to the log command
 */
const defaultCommand: Command = {
  name: 'default',
  description: 'Default command that logs a life entry',
  
  async execute(args: string[], options: CommandOptions): Promise<void> {
    try {
      // Check if setup is complete
      if (!(await isSetupComplete())) {
        logger.error('lg is not set up yet. Please run "lg setup" first.');
        return;
      }
      
      // If no arguments are provided, show help
      if (args.length === 0) {
        logger.info('Usage: lg "Your message here"');
        logger.info('Or use a specific command:');
        logger.info('  lg setup - Initialize the lg CLI');
        logger.info('  lg log "Your message" - Log a life entry');
        return;
      }
      
      // Forward to log command
      await logCommand.execute(args, options);
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
};

export default defaultCommand; 