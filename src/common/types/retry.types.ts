export interface RetryConfig {
  maxRetries: number;
  backoffIntervals: number[];
  batchSize: number;
}

export interface RetryOptions {
  maxRetries?: number;
  backoffIntervals?: number[];
  batchSize?: number;
  delay?: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export interface RetryStats {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryTime: number;
  lastRetryAt?: Date;
}