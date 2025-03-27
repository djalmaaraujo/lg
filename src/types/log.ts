/**
 * Interface for a log entry
 */
export interface LogEntry {
  /**
   * Timestamp of the entry (ISO format)
   */
  timestamp: string;
  
  /**
   * Content of the entry
   */
  content: string;

  /**
   * Timestamp of when the entry was last updated (ISO format)
   * Will be null for entries that have never been edited
   */
  updated_at: string | null;
}

/**
 * Type for the storage file content
 */
export type Storage = LogEntry[];