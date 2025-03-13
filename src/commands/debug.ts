import chalk from 'chalk';
import { Command, CommandOptions } from '../types/index.js';
import {
  logger,
  enableDebugLogs,
  disableDebugLogs,
  isDebugEnabled,
  initLogger,
} from '../utils/logger.js';

/**
 * Debug command implementation
 */
const debugCommand: Command = {
  name: 'debug',
  description: 'Enable or disable debug logging',
  aliases: ['dbg'],
  options: [
    {
      flags: '-e, --enable',
      description: 'Enable debug logging',
    },
    {
      flags: '-d, --disable',
      description: 'Disable debug logging',
    },
    {
      flags: '-s, --status',
      description: 'Show current debug logging status',
    },
  ],

  async execute(_args: string[], options: CommandOptions): Promise<void> {
    try {
      // Initialize logger to ensure we have the latest config
      await initLogger();

      // If no options provided, show status
      if (Object.keys(options).length === 0) {
        options.status = true;
      }

      // Handle enable option
      if (options.enable) {
        await enableDebugLogs();
        logger.info(chalk.green('Debug logging enabled'));
        return;
      }

      // Handle disable option
      if (options.disable) {
        await disableDebugLogs();
        logger.info(chalk.yellow('Debug logging disabled'));
        return;
      }

      // Handle status option
      if (options.status) {
        const status = isDebugEnabled();
        logger.info(
          `Debug logging is currently ${status ? chalk.green('enabled') : chalk.yellow('disabled')}`
        );
        return;
      }

      // If we get here, no valid options were provided
      logger.info('Usage: lg debug [options]');
      logger.info('Options:');
      logger.info('  -e, --enable    Enable debug logging');
      logger.info('  -d, --disable   Disable debug logging');
      logger.info('  -s, --status    Show current debug logging status');
    } catch (error) {
      logger.error(
        `Error managing debug settings: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  },
};

export default debugCommand;
