// src/utils/logger.ts
import chalk from 'chalk';
import { LogLevel, Logger } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Path to the debug config file
const DEBUG_CONFIG_FILE = path.join(os.homedir(), '.lg', 'debug_config.json');

// Default debug state
let debugEnabled = false;

/**
 * Initialize the logger by loading debug configuration
 */
export async function initLogger(): Promise<void> {
  try {
    const configExists = await fs
      .access(DEBUG_CONFIG_FILE)
      .then(() => true)
      .catch(() => false);

    if (configExists) {
      const configData = await fs.readFile(DEBUG_CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configData);
      debugEnabled = config.debugEnabled || false;
    }
  } catch (error) {
    // If there's an error reading the config, default to debug disabled
    debugEnabled = false;
  }
}

/**
 * Enable debug logging
 */
export async function enableDebugLogs(): Promise<void> {
  debugEnabled = true;
  await saveDebugConfig();
}

/**
 * Disable debug logging
 */
export async function disableDebugLogs(): Promise<void> {
  debugEnabled = false;
  await saveDebugConfig();
}

/**
 * Get current debug logging state
 */
export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/**
 * Save debug configuration to file
 */
async function saveDebugConfig(): Promise<void> {
  try {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(DEBUG_CONFIG_FILE), { recursive: true });

    // Save the config
    await fs.writeFile(DEBUG_CONFIG_FILE, JSON.stringify({ debugEnabled }, null, 2));
  } catch (error) {
    console.error(
      `Failed to save debug config: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Creates a logger with colored output
 * @returns Logger instance
 */
export function createLogger(): Logger {
  return {
    debug: (message: string): void => {
      // Only log debug messages if debug is enabled
      if (debugEnabled) {
        console.log(chalk.gray(`[DEBUG] ${message}`));
      }
    },

    info: (message: string): void => {
      console.log(chalk.blue(`[INFO] ${message}`));
    },

    warn: (message: string): void => {
      console.log(chalk.yellow(`[WARN] ${message}`));
    },

    error: (message: string): void => {
      console.error(chalk.red(`[ERROR] ${message}`));
    },
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
