import { Command, CommandOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { isSetupComplete } from './setup.js';
import logCommand from './log.js';
import listCommand from './list.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * Default command implementation
 * This command is executed when no command is specified
 * It forwards the arguments to the log command if arguments are provided
 * If no arguments are provided, it shows an interactive prompt or lists entries
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

      // If no arguments are provided, show interactive prompt or list entries
      if (args.length === 0) {
        // Show interactive prompt for logging
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Log a new entry', value: 'log' },
              { name: 'View existing entries', value: 'list' },
            ],
          },
        ]);

        if (action === 'log') {
          // Prompt for the log entry content
          const { content } = await inquirer.prompt([
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

          // Forward to log command with the entered content
          await logCommand.execute([content], options);
        } else {
          // Run the list command
          await listCommand.execute([], {});
        }
        return;
      }

      // Check if the arguments might contain special characters that need quotes
      const joinedArgs = args.join(' ');
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
      const mightHaveSpecialChars = specialChars.some((char) => joinedArgs.includes(char));

      if (mightHaveSpecialChars) {
        logger.info(
          chalk.yellow(
            "Tip: Your entry contains special characters. If you're missing part of your text, try using quotes:"
          )
        );
        logger.info(chalk.cyan(`lg "${joinedArgs}"`));
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
