/**
 * src/utils/gistSync.ts
 * Utility for syncing log entries with GitHub Gists
 */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
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

// Track if a sync is currently in progress
let syncInProgress = false;
let lastSyncTimestamp = 0;
const SYNC_DEBOUNCE_MS = 5000; // 5 seconds debounce

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
 * Check if internet is available by making a small request to GitHub API
 */
export async function isInternetAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch('https://api.github.com/zen', {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    logger.debug(
      `Internet check failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Create a new gist with log entries
 */
export async function createGist(token: string, entries: Storage): Promise<string> {
  try {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Life Logger CLI Storage',
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(entries, null, 2),
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = (await response.json()) as GistResponse;
    logger.debug(`Created gist with ID: ${data.id}`);
    return data.id;
  } catch (error) {
    logger.error(
      `Failed to create gist: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Update an existing gist with log entries
 */
export async function updateGist(token: string, gistId: string, entries: Storage): Promise<void> {
  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Life Logger CLI Storage',
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(entries, null, 2),
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    logger.debug(`Updated gist with ID: ${gistId}`);
  } catch (error) {
    logger.error(
      `Failed to update gist: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Fetch entries from a gist
 */
export async function fetchGistEntries(token: string, gistId: string): Promise<Storage | null> {
  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = (await response.json()) as GistResponse;
    const gistContent = data.files[GIST_FILENAME]?.content;

    if (!gistContent) {
      logger.error(`Gist does not contain ${GIST_FILENAME}`);
      return null;
    }

    logger.debug(`Fetched entries from gist with ID: ${gistId}`);
    return JSON.parse(gistContent) as Storage;
  } catch (error) {
    logger.error(`Failed to fetch gist: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Sync local entries with gist in the background
 * This function doesn't block and returns immediately
 * @param localEntries The local entries to sync
 */
export function syncWithGistInBackground(localEntries: Storage): void {
  // Don't start a new sync if one is already in progress or if we synced recently
  const now = Date.now();
  if (syncInProgress || now - lastSyncTimestamp < SYNC_DEBOUNCE_MS) {
    logger.debug('Skipping background sync: another sync is in progress or synced recently');
    return;
  }

  // Start background sync
  syncInProgress = true;

  // Clone the entries to avoid any potential mutation issues
  const entriesToSync = JSON.parse(JSON.stringify(localEntries)) as Storage;

  (async () => {
    try {
      // Check if sync is configured
      const config = await loadGistConfig();
      if (!config || !config.token || !config.gistId) {
        logger.debug('Gist sync not configured, skipping background sync');
        syncInProgress = false;
        return;
      }

      // Check internet connectivity first
      const isOnline = await isInternetAvailable();
      if (!isOnline) {
        logger.debug('No internet connection, skipping background sync');
        syncInProgress = false;
        return;
      }

      // Update the gist with local entries
      await updateGist(config.token, config.gistId, entriesToSync);
      logger.debug('Successfully synced entries with gist in background');

      // Update last sync timestamp
      lastSyncTimestamp = Date.now();
    } catch (error) {
      logger.error(
        `Background sync failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      syncInProgress = false;
    }
  })().catch((error) => {
    logger.error(
      `Unhandled error in background sync: ${error instanceof Error ? error.message : String(error)}`
    );
    syncInProgress = false;
  });
}

/**
 * Sync local entries with gist
 * This is the main function that should be called after any modification to entries
 * It now returns immediately and performs the sync in the background
 */
export async function syncWithGist(localEntries: Storage): Promise<Storage> {
  // Start the sync in the background
  syncWithGistInBackground(localEntries);

  // Return immediately with the local entries
  return localEntries;
}

/**
 * Perform a full sync with the remote gist
 * This is a blocking operation that will fetch remote entries and merge them with local entries
 * Use this when you want to ensure you have the latest data from the remote
 */
export async function performFullSync(localEntries: Storage): Promise<Storage> {
  try {
    // Check if sync is configured
    const config = await loadGistConfig();
    if (!config || !config.token || !config.gistId) {
      logger.debug('Gist sync not configured, skipping full sync');
      return localEntries;
    }

    // Check internet connectivity
    const isOnline = await isInternetAvailable();
    if (!isOnline) {
      logger.debug('No internet connection, skipping full sync');
      return localEntries;
    }

    // Fetch remote entries
    const remoteEntries = await fetchGistEntries(config.token, config.gistId);
    if (!remoteEntries) {
      logger.debug('No remote entries found, using local entries only');

      // Still update the remote with our local entries
      await updateGist(config.token, config.gistId, localEntries);
      return localEntries;
    }

    // Merge local and remote entries
    // Create a map of existing entry timestamps to avoid duplicates
    const existingTimestamps = new Set(localEntries.map((entry) => entry.timestamp));

    // Add remote entries that don't exist locally
    for (const remoteEntry of remoteEntries) {
      if (!existingTimestamps.has(remoteEntry.timestamp)) {
        localEntries.push(remoteEntry);
      }
    }

    // Sort entries by timestamp (newest first)
    localEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Update the gist with merged entries
    await updateGist(config.token, config.gistId, localEntries);
    logger.debug('Successfully performed full sync with gist');

    // Update last sync timestamp
    lastSyncTimestamp = Date.now();

    return localEntries;
  } catch (error) {
    logger.error(
      `Failed to perform full sync: ${error instanceof Error ? error.message : String(error)}`
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
