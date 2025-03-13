// src/utils/logger.ts
import chalk from 'chalk';
import { LogLevel, Logger } from '../types/index.js';

/**
 * Creates a logger with colored output
 * @returns Logger instance
 */
export function createLogger(): Logger {
  return {
    debug: (message: string): void => {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    },
    
    info: (message: string): void => {
      console.log(chalk.blue(`[INFO] ${message}`));
    },
    
    warn: (message: string): void => {
      console.log(chalk.yellow(`[WARN] ${message}`));
    },
    
    error: (message: string): void => {
      console.error(chalk.red(`[ERROR] ${message}`));
    }
  };
}

// Default logger instance
export const logger = createLogger();

/**
 * Log a message with a specific level
 * @param level Log level
 * @param message Message to log
 */
export function log(level: LogLevel, message: string): void {
  switch (level) {
    case LogLevel.DEBUG:
      logger.debug(message);
      break;
    case LogLevel.INFO:
      logger.info(message);
      break;
    case LogLevel.WARN:
      logger.warn(message);
      break;
    case LogLevel.ERROR:
      logger.error(message);
      break;
    default:
      logger.info(message);
  }
} 