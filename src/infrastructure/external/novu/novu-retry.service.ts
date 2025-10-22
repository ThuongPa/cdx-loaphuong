import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RetryableError extends Error {
  isRetryable: boolean;
  statusCode?: number;
}

@Injectable()
export class NovuRetryService {
  private readonly logger = new Logger(NovuRetryService.name);
  private readonly defaultRetryOptions: RetryOptions;

  constructor(private readonly configService: ConfigService) {
    const novuConfig = this.configService.get('novu');
    this.defaultRetryOptions = {
      maxRetries: novuConfig.retries || 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
    };
  }

  /**
   * Execute function with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
  ): Promise<T> {
    const retryOptions = { ...this.defaultRetryOptions, ...options };
    let lastError: Error;

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt + 1}/${retryOptions.maxRetries + 1}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === retryOptions.maxRetries) {
          this.logger.error(`Operation failed after ${attempt + 1} attempts:`, error);
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, retryOptions);
        this.logger.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retryOptions.maxRetries}):`,
          error.message,
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND'
    ) {
      return true;
    }

    // HTTP status codes that are retryable
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      return status >= 500 || status === 429; // Server errors and rate limiting
    }

    // Custom retryable/non-retryable error
    if (error.isRetryable !== undefined) {
      return error.isRetryable;
    }

    // Non-retryable errors
    if (
      error.status === 400 ||
      error.status === 401 ||
      error.status === 403 ||
      error.status === 404
    ) {
      return false;
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    const delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt);
    return Math.min(delay, options.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create retryable error
   */
  createRetryableError(message: string, originalError?: Error): RetryableError {
    const error = new Error(message) as RetryableError;
    error.isRetryable = true;
    if (originalError) {
      error.cause = originalError;
    }
    return error;
  }

  /**
   * Create non-retryable error
   */
  createNonRetryableError(message: string, originalError?: Error): RetryableError {
    const error = new Error(message) as RetryableError;
    error.isRetryable = false;
    if (originalError) {
      error.cause = originalError;
    }
    return error;
  }

  /**
   * Classify error as retryable or non-retryable
   */
  classifyError(error: any): { isRetryable: boolean; reason: string } {
    if (error.isRetryable !== undefined) {
      return {
        isRetryable: error.isRetryable,
        reason: error.isRetryable
          ? 'Explicitly marked as retryable'
          : 'Explicitly marked as non-retryable',
      };
    }

    // Network errors
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT'
    ) {
      return {
        isRetryable: true,
        reason: 'Network connectivity issue',
      };
    }

    // HTTP status codes
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      if (status >= 500) {
        return {
          isRetryable: true,
          reason: `Server error (${status})`,
        };
      }
      if (status === 429) {
        return {
          isRetryable: true,
          reason: 'Rate limiting (429)',
        };
      }
      if (status >= 400 && status < 500) {
        return {
          isRetryable: false,
          reason: `Client error (${status})`,
        };
      }
    }

    // Default to retryable for unknown errors
    return {
      isRetryable: true,
      reason: 'Unknown error, defaulting to retryable',
    };
  }

  /**
   * Log error with classification
   */
  logError(error: any, context: string): void {
    const classification = this.classifyError(error);
    const logLevel = classification.isRetryable ? 'warn' : 'error';

    this.logger[logLevel](`${context} - ${classification.reason}:`, {
      message: error.message,
      stack: error.stack,
      isRetryable: classification.isRetryable,
      status: error.status || error.statusCode,
      code: error.code,
    });
  }
}
