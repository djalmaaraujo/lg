// tests/commands/log.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import logCommand from '../../src/commands/log.js';
import { STORAGE_FILE } from '../../src/commands/setup.js';

// Mock fs module
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock setup module
vi.mock('../../src/commands/setup.js', () => ({
  isSetupComplete: vi.fn(),
  STORAGE_FILE: '/mock/path/to/.lg/storage.json',
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Date
const mockDate = new Date('2023-01-01T12:00:00Z');
const originalDate = global.Date;

describe('Log Command', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Mock Date.now and new Date()
    global.Date = vi.fn(() => mockDate) as unknown as DateConstructor;
    global.Date.now = vi.fn(() => mockDate.getTime());
    global.Date.parse = originalDate.parse;
    global.Date.UTC = originalDate.UTC;
    global.Date.prototype = originalDate.prototype;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.Date = originalDate;
  });

  describe('execute', () => {
    it('should add a log entry to the storage file', async () => {
      // Mock isSetupComplete to return true
      const { isSetupComplete } = await import('../../src/commands/setup.js');
      vi.mocked(isSetupComplete).mockResolvedValueOnce(true);

      // Mock readFile to return an empty array
      vi.mocked(fs.readFile).mockResolvedValueOnce('[]');

      // Mock writeFile
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);

      // Execute the command
      await logCommand.execute(['Test', 'message'], {});

      // Check that readFile was called
      expect(fs.readFile).toHaveBeenCalledWith(STORAGE_FILE, 'utf-8');

      // Check that writeFile was called with the correct arguments
      expect(fs.writeFile).toHaveBeenCalledWith(
        STORAGE_FILE,
        JSON.stringify(
          [
            {
              timestamp: mockDate.toISOString(),
              content: 'Test message',
            },
          ],
          null,
          2
        )
      );
    });

    it('should append to existing entries', async () => {
      // Mock isSetupComplete to return true
      const { isSetupComplete } = await import('../../src/commands/setup.js');
      vi.mocked(isSetupComplete).mockResolvedValueOnce(true);

      // Mock readFile to return existing entries
      const existingEntries = [
        {
          timestamp: '2022-12-31T12:00:00Z',
          content: 'Existing entry',
        },
      ];
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(existingEntries));

      // Mock writeFile
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);

      // Execute the command
      await logCommand.execute(['New', 'entry'], {});

      // Check that writeFile was called with the correct arguments
      expect(fs.writeFile).toHaveBeenCalledWith(
        STORAGE_FILE,
        JSON.stringify(
          [
            ...existingEntries,
            {
              timestamp: mockDate.toISOString(),
              content: 'New entry',
            },
          ],
          null,
          2
        )
      );
    });

    it('should show an error if setup is not complete', async () => {
      // Mock isSetupComplete to return false
      const { isSetupComplete } = await import('../../src/commands/setup.js');
      vi.mocked(isSetupComplete).mockResolvedValueOnce(false);

      // Import logger
      const { logger } = await import('../../src/utils/logger.js');

      // Execute the command
      await logCommand.execute(['Test'], {});

      // Check that error was logged
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('not set up yet'));

      // Check that readFile and writeFile were not called
      expect(fs.readFile).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should show an error if no message is provided', async () => {
      // Mock isSetupComplete to return true
      const { isSetupComplete } = await import('../../src/commands/setup.js');
      vi.mocked(isSetupComplete).mockResolvedValueOnce(true);

      // Import logger
      const { logger } = await import('../../src/utils/logger.js');

      // Execute the command with empty args
      await logCommand.execute([], {});

      // Check that error was logged
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('provide a message'));

      // Check that readFile and writeFile were not called
      expect(fs.readFile).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });
});
