import Conf from 'conf';
import { Config } from '../types/index.js';

/**
 * Default configuration values
 */
const defaultConfig: Config = {
  // Add default configuration values here
  logLevel: 'info',
  // Other default settings
};

/**
 * Configuration store
 */
const configStore = new Conf<Config>({
  projectName: 'lg',
  defaults: defaultConfig,
});

/**
 * Get a configuration value
 * @param key Configuration key
 * @returns Configuration value
 */
export function getConfig<T>(key: string): T {
  return configStore.get(key) as T;
}

/**
 * Set a configuration value
 * @param key Configuration key
 * @param value Configuration value
 */
export function setConfig(key: string, value: unknown): void {
  configStore.set(key, value);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  configStore.clear();
  configStore.set(defaultConfig);
}

/**
 * Get all configuration
 * @returns All configuration
 */
export function getAllConfig(): Config {
  return configStore.store;
} 