import { Command, CommandOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete } from './setup.js';
import logCommand from './log.js';
import listCommand from './list.js';

/**
 * Default command implementation
 * This command is executed when no command is specified
 * It forwards the arguments to the log command if arguments are provided
 * If no arguments are provided, it triggers the list command
 */
const defaultCommand: Command = {
  name: 'default',
  description: 'Default command that logs a life entry or lists entries if no arguments provided',

  async execute(args: string[], options: CommandOptions): Promise<void> {
    try {
      // Check if setup is complete
      if (!(await isSetupComplete())) {
        logger.error('lg is not set up yet. Please run "lg setup" first.');
        return;
      }

      // If no arguments are provided, run the list command
      if (args.length === 0) {
        await listCommand.execute([], {});
        return;
      }

      // Forward to log command
      await logCommand.execute(args, options);
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },
};

export default defaultCommand;
