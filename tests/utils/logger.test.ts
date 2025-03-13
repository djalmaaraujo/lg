// tests/utils/logger.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, log, LogLevel } from '../../src/utils/logger.js';

describe('Logger', () => {
  // Mock console methods
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with all required methods', () => {
      const logger = createLogger();
      
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should log messages with appropriate prefixes', () => {
      const logger = createLogger();
      
      logger.debug('Debug message');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] Debug message'));
      
      logger.info('Info message');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[INFO] Info message'));
      
      logger.warn('Warning message');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[WARN] Warning message'));
      
      logger.error('Error message');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR] Error message'));
    });
  });

  describe('log', () => {
    it('should log messages with the specified level', () => {
      log(LogLevel.DEBUG, 'Debug message');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] Debug message'));
      
      log(LogLevel.INFO, 'Info message');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[INFO] Info message'));
      
      log(LogLevel.WARN, 'Warning message');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[WARN] Warning message'));
      
      log(LogLevel.ERROR, 'Error message');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR] Error message'));
    });
  });
}); 