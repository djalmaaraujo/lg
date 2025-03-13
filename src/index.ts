#!/usr/bin/env node
// src/index.ts
import { Command as CommanderCommand } from 'commander';
import { getCommands } from './commands/index.js';
import { logger } from './utils/logger.js';

/**
 * Main CLI program
 */
const program = new CommanderCommand();

// Set up program metadata
program
  .name('lg')
  .description('A powerful CLI tool built with TypeScript and Node.js')
  .version('0.1.0');

/**
 * Initialize the CLI
 */
async function init(): Promise<void> {
  try {
    // Register commands
    const commands = getCommands();
    
    // If no commands are registered yet, show help
    if (commands.length === 0) {
      program.addHelpText('after', '\nNo commands are registered yet.');
    }
    
    // Register each command with Commander
    commands.forEach((cmd) => {
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
          command.option(opt.flags, opt.description, opt.defaultValue);
        });
      }
      
      // Set action handler
      command.action(async (options) => {
        try {
          await cmd.execute(command.args, options);
        } catch (error) {
          logger.error(`Error executing command ${cmd.name}: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      });
    });
    
    // Add help information
    program.addHelpText('after', '\nFor more information, visit: https://github.com/yourusername/lg');
    
    // Parse command line arguments
    program.parse(process.argv);
    
    // If no command is specified, show help
    if (!process.argv.slice(2).length) {
      program.help();
    }
  } catch (error) {
    logger.error(`Error initializing CLI: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the CLI
init().catch((error) => {
  logger.error(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}); 