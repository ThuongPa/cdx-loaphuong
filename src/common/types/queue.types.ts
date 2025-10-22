export enum QueueStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  PAUSED = 'paused',
  ERROR = 'error',
}

export enum QueuePriority {
  URGENT = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}

export interface QueueItem<T = any> {
  id: string;
  data: T;
  priority: QueuePriority;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  processedAt?: Date;
  error?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
  throughput: number;
}

export interface QueueConfig {
  concurrency: number;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  maxQueueSize: number;
}