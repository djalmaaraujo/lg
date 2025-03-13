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
}

/**
 * Type for the storage file content
 */
export type Storage = LogEntry[]; 