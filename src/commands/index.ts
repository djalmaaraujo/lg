import { Command } from '../types/index.js';
import setupCommand from './setup.js';
import logCommand from './log.js';
import listCommand from './list.js';
import defaultCommand from './default.js';

/**
 * Registry of available commands
 */
const commands: Command[] = [];

/**
 * Register a command
 * @param command Command to register
 */
export function registerCommand(command: Command): void {
  commands.push(command);
}

/**
 * Get all registered commands
 * @returns Array of registered commands
 */
export function getCommands(): Command[] {
  return commands;
}

/**
 * Find a command by name or alias
 * @param nameOrAlias Command name or alias
 * @returns Command if found, undefined otherwise
 */
export function findCommand(nameOrAlias: string): Command | undefined {
  return commands.find(
    (cmd) => cmd.name === nameOrAlias || (cmd.aliases && cmd.aliases.includes(nameOrAlias))
  );
}

/**
 * Register multiple commands
 * @param cmds Commands to register
 */
export function registerCommands(cmds: Command[]): void {
  cmds.forEach(registerCommand);
}

/**
 * Get the default command
 * @returns Default command
 */
export function getDefaultCommand(): Command {
  return defaultCommand;
}

// Register commands
registerCommand(setupCommand);
registerCommand(logCommand);
registerCommand(listCommand);
registerCommand(defaultCommand); 