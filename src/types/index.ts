/**
 * Interface for command options
 */
export interface CommandOptions {
  [key: string]: unknown;
}

/**
 * Interface for command implementation
 */
export interface Command {
  /**
   * Name of the command
   */
  name: string;
  
  /**
   * Description of the command
   */
  description: string;
  
  /**
   * Command aliases
   */
  aliases?: string[];
  
  /**
   * Command options
   */
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: unknown;
  }>;
  
  /**
   * Execute the command
   * @param args Command arguments
   * @param options Command options
   * @returns Promise that resolves when command completes
   */
  execute: (args: string[], options: CommandOptions) => Promise<void>;
}

/**
 * Configuration interface
 */
export interface Config {
  [key: string]: unknown;
}

/**
 * Logger levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
} 