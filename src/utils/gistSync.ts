/**
 * src/utils/gistSync.ts
 * Utility for syncing log entries with GitHub Gists
 */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { logger } from './logger.js';
import { Storage } from '../types/log.js';

// Constants
export const GIST_CONFIG_FILE = path.join(os.homedir(), '.lg', 'gist_config.json');
export const GIST_FILENAME = 'lg_cli_storage.json';

// Types
interface GistConfig {
  token: string;
  gistId?: string;
}

interface GistFile {
  content: string;
}

interface GistResponse {
  id: string;
  files: {
    [key: string]: GistFile;
  };
}

/**
 * Save GitHub token and gist ID to config file
 */
export async function saveGistConfig(token: string, gistId?: string): Promise<void> {
  try {
    const config: GistConfig = { token };
    if (gistId) {
      config.gistId = gistId;
    }

    await fs.mkdir(path.dirname(GIST_CONFIG_FILE), { recursive: true });
    await fs.writeFile(GIST_CONFIG_FILE, JSON.stringify(config, null, 2));
    logger.debug('Gist configuration saved');
  } catch (error) {
    logger.error(
      `Failed to save gist config: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Load GitHub token and gist ID from config file
 */
export async function loadGistConfig(): Promise<GistConfig | null> {
  try {
    const configExists = await fs
      .access(GIST_CONFIG_FILE)
      .then(() => true)
      .catch(() => false);

    if (!configExists) {
      return null;
    }

    const configData = await fs.readFile(GIST_CONFIG_FILE, 'utf-8');
    return JSON.parse(configData) as GistConfig;
  } catch (error) {
    logger.error(
      `Failed to load gist config: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/**
 * Check if Gist sync is configured
 */
export async function isGistSyncConfigured(): Promise<boolean> {
  const config = await loadGistConfig();
  return !!(config && config.token && config.gistId);
}

/**
 * Create a new gist with log entries
 */
export async function createGist(token: string, entries: Storage): Promise<string> {
  try {
    const response = await axios.post<GistResponse>(
      'https://api.github.com/gists',
      {
        description: 'Life Logger CLI Storage',
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(entries, null, 2),
          },
        },
      },
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    logger.debug(`Created gist with ID: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      logger.error(
        `Failed to create gist: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else {
      logger.error(
        `Failed to create gist: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    throw error;
  }
}

/**
 * Update an existing gist with log entries
 */
export async function updateGist(token: string, gistId: string, entries: Storage): Promise<void> {
  try {
    await axios.patch(
      `https://api.github.com/gists/${gistId}`,
      {
        description: 'Life Logger CLI Storage',
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(entries, null, 2),
          },
        },
      },
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    logger.debug(`Updated gist with ID: ${gistId}`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      logger.error(
        `Failed to update gist: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else {
      logger.error(
        `Failed to update gist: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    throw error;
  }
}

/**
 * Fetch entries from a gist
 */
export async function fetchGistEntries(token: string, gistId: string): Promise<Storage | null> {
  try {
    const response = await axios.get<GistResponse>(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    const gistContent = response.data.files[GIST_FILENAME]?.content;
    if (!gistContent) {
      logger.error(`Gist does not contain ${GIST_FILENAME}`);
      return null;
    }

    logger.debug(`Fetched entries from gist with ID: ${gistId}`);
    return JSON.parse(gistContent) as Storage;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      logger.error(
        `Failed to fetch gist: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else {
      logger.error(
        `Failed to fetch gist: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return null;
  }
}

/**
 * Sync local entries with gist
 * This is the main function that should be called after any modification to entries
 */
export async function syncWithGist(localEntries: Storage): Promise<Storage> {
  try {
    const config = await loadGistConfig();
    if (!config || !config.token || !config.gistId) {
      logger.debug('Gist sync not configured, skipping sync');
      return localEntries;
    }

    // Update the gist with local entries
    await updateGist(config.token, config.gistId, localEntries);
    logger.debug('Successfully synced entries with gist');

    return localEntries;
  } catch (error) {
    logger.error(
      `Failed to sync with gist: ${error instanceof Error ? error.message : String(error)}`
    );
    return localEntries;
  }
}

/**
 * Initialize gist sync during setup
 * This handles the case where remote gist might have entries but local storage is empty
 */
export async function initializeGistSync(
  token: string,
  localEntries: Storage
): Promise<{ entries: Storage; gistId: string }> {
  try {
    // Check if we already have a gist ID saved
    const existingConfig = await loadGistConfig();
    let gistId = existingConfig?.gistId;
    let remoteEntries: Storage | null = null;

    if (gistId) {
      // Try to fetch entries from existing gist
      remoteEntries = await fetchGistEntries(token, gistId);
    }

    // If no existing gist or couldn't fetch, create a new one
    if (!gistId || !remoteEntries) {
      gistId = await createGist(token, localEntries);
      await saveGistConfig(token, gistId);
      return { entries: localEntries, gistId };
    }

    // Merge local and remote entries if both have data
    if (localEntries.length > 0 && remoteEntries.length > 0) {
      // Create a map of existing entry timestamps to avoid duplicates
      const existingTimestamps = new Set(localEntries.map((entry) => entry.timestamp));

      // Add remote entries that don't exist locally
      for (const remoteEntry of remoteEntries) {
        if (!existingTimestamps.has(remoteEntry.timestamp)) {
          localEntries.push(remoteEntry);
        }
      }

      // Sort entries by timestamp (newest first)
      localEntries.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Update the gist with merged entries
      await updateGist(token, gistId, localEntries);
      await saveGistConfig(token, gistId);

      return { entries: localEntries, gistId };
    }

    // If local is empty but remote has entries, use remote
    if (localEntries.length === 0 && remoteEntries.length > 0) {
      await saveGistConfig(token, gistId);
      return { entries: remoteEntries, gistId };
    }

    // If remote is empty but local has entries, update remote
    if (localEntries.length > 0 && remoteEntries.length === 0) {
      await updateGist(token, gistId, localEntries);
      await saveGistConfig(token, gistId);
      return { entries: localEntries, gistId };
    }

    // Both are empty, just save the config
    await saveGistConfig(token, gistId);
    return { entries: localEntries, gistId };
  } catch (error) {
    logger.error(
      `Failed to initialize gist sync: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}
