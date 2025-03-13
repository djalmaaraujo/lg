#!/usr/bin/env node
// src/index.ts
import { Command as CommanderCommand } from 'commander';
import { getCommands, getDefaultCommand } from './commands/index.js';
import { logger } from './utils/logger.js';

/**
 * Main CLI program
 */
const program = new CommanderCommand();

// Set up program metadata
program.name('lg').description('A life logger CLI tool').version('0.1.0');

/**
 * Initialize the CLI
 */
async function init(): Promise<void> {
  try {
    // Register commands
    const commands = getCommands();

    // Register each command with Commander
    commands.forEach((cmd) => {
      // Skip the default command as it's handled separately
      if (cmd.name === 'default') {
        return;
      }

      const command = program.command(cmd.name);

      // Set command description
      command.description(cmd.description);

      // Add command aliases if any
      if (cmd.aliases && cmd.aliases.length > 0) {
        command.aliases(cmd.aliases);
      }

      // Add command options if any
      if (cmd.options && cmd.options.length > 0) {
        cmd.options.forEach((opt) => {
          // Cast defaultValue to string | boolean | string[] | undefined to satisfy TypeScript
          const defaultValue = opt.defaultValue as string | boolean | string[] | undefined;
          command.option(opt.flags, opt.description, defaultValue);
        });
      }

      // Set action handler
      command.action(async (options) => {
        try {
          await cmd.execute(command.args, options);
        } catch (error) {
          logger.error(
            `Error executing command ${cmd.name}: ${error instanceof Error ? error.message : String(error)}`
          );
          process.exit(1);
        }
      });
    });

    // Handle default command (when no command is specified)
    program.argument('[message...]', 'Message to log').action(async (message) => {
      try {
        const defaultCommand = getDefaultCommand();
        await defaultCommand.execute(message, {});
      } catch (error) {
        logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

    // Add help information
    program.addHelpText(
      'after',
      '\nExamples:\n  $ lg setup\n  $ lg "Had a great day today!"\n  $ lg log "Learned something new"\n  $ lg - Show all entries\n\nNote: For entries with special characters like #, !, &, (), etc., you must use quotes or escape them with backslashes.'
    );

    // Parse command line arguments
    program.parse(process.argv);
  } catch (error) {
    logger.error(
      `Error initializing CLI: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

// Start the CLI
init().catch((error) => {
  logger.error(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
