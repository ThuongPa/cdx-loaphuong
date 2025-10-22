export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface UserSyncData {
  id: string;
  userId: string;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncStatistics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
  averageSyncTime: number;
  lastSyncAt?: Date;
}

export interface SyncFilters {
  userId?: string;
  status?: SyncStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface SyncSortOptions {
  field: 'createdAt' | 'startedAt' | 'completedAt';
  order: 'asc' | 'desc';
}

export interface SyncPaginationOptions {
  page: number;
  limit: number;
}

export interface SyncQueryResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}