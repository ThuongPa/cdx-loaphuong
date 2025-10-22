export interface DLQStatistics {
  totalEntries: number;
  entriesByStatus: Record<string, number>;
  entriesByChannel: Record<string, number>;
  entriesByType: Record<string, number>;
  averageRetryCount: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}
