// tests/commands/setup.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { isSetupComplete, LG_DIR, STORAGE_FILE } from '../../src/commands/setup.js';
import setupCommand from '../../src/commands/setup.js';

// Mock fs module
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
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

describe('Setup Command', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isSetupComplete', () => {
    it('should return true if storage file exists', async () => {
      // Mock fs.access to resolve (file exists)
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      const result = await isSetupComplete();

      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(STORAGE_FILE);
    });

    it('should return false if storage file does not exist', async () => {
      // Mock fs.access to reject (file does not exist)
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('File not found'));

      const result = await isSetupComplete();

      expect(result).toBe(false);
      expect(fs.access).toHaveBeenCalledWith(STORAGE_FILE);
    });
  });

  describe('execute', () => {
    it('should create directory and storage file if not already set up', async () => {
      // Mock isSetupComplete to return false
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('File not found'));

      // Mock fs.mkdir and fs.writeFile to resolve
      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);

      await setupCommand.execute([], {});

      expect(fs.mkdir).toHaveBeenCalledWith(LG_DIR, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(STORAGE_FILE, JSON.stringify([], null, 2));
    });

    it('should not create directory and storage file if already set up', async () => {
      // Mock isSetupComplete to return true
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      await setupCommand.execute([], {});

      expect(fs.mkdir).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });
});
