import { Injectable, Logger } from '@nestjs/common';

export enum ErrorType {
  RETRYABLE = 'retryable',
  NON_RETRYABLE = 'non_retryable',
  TOKEN_INVALID = 'token_invalid',
  RATE_LIMITED = 'rate_limited',
}

export interface ErrorClassification {
  type: ErrorType;
  shouldRetry: boolean;
  retryAfter?: number; // seconds
  shouldCleanupToken?: boolean;
  shouldMoveToDLQ?: boolean;
  userFriendlyMessage: string;
}

export interface NovuError {
  status?: number;
  code?: string;
  message?: string;
  name?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
}

@Injectable()
export class ErrorClassifierService {
  private readonly logger = new Logger(ErrorClassifierService.name);

  // Retryable error patterns
  private readonly retryablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /temporary/i,
    /unavailable/i,
    /service unavailable/i,
    /internal server error/i,
    /bad gateway/i,
    /gateway timeout/i,
  ];

  // Non-retryable error patterns
  private readonly nonRetryablePatterns = [
    /invalid token/i,
    /unauthorized/i,
    /forbidden/i,
    /not found/i,
    /bad request/i,
    /validation error/i,
    /malformed/i,
    /invalid payload/i,
  ];

  // Token invalid patterns
  private readonly tokenInvalidPatterns = [
    /invalid token/i,
    /token expired/i,
    /token not found/i,
    /invalid device token/i,
    /device token not found/i,
  ];

  // Rate limit patterns
  private readonly rateLimitPatterns = [
    /rate limit/i,
    /too many requests/i,
    /quota exceeded/i,
    /throttled/i,
  ];

  /**
   * Classify error and determine retry strategy
   */
  classifyError(error: unknown): ErrorClassification {
    try {
      this.logger.debug('Classifying error:', {
        error: (error as any)?.message || error,
        status: (error as any)?.status,
        code: (error as any)?.code,
        name: (error as any)?.name,
      });

      // Handle Novu API errors
      if (this.isNovuError(error)) {
        return this.classifyNovuError(error as NovuError);
      }

      // Handle HTTP errors
      if (this.isHttpError(error)) {
        return this.classifyHttpError(error);
      }

      // Handle generic errors
      return this.classifyGenericError(error);
    } catch (classificationError) {
      this.logger.error('Error during error classification:', classificationError);

      // Default to non-retryable for unknown errors
      return {
        type: ErrorType.NON_RETRYABLE,
        shouldRetry: false,
        shouldMoveToDLQ: true,
        userFriendlyMessage: 'An unexpected error occurred. Please contact support.',
      };
    }
  }

  /**
   * Check if error is from Novu API
   */
  private isNovuError(error: unknown): boolean {
    return (
      (error as any)?.response?.data?.error ||
      (error as any)?.message?.includes('Novu') ||
      (error as any)?.name?.includes('Novu') ||
      ((error as any)?.status >= 400 && (error as any)?.status < 600)
    );
  }

  /**
   * Check if error is HTTP error
   */
  private isHttpError(error: unknown): boolean {
    return (error as any)?.status && typeof (error as any).status === 'number';
  }

  /**
   * Classify Novu API errors
   */
  private classifyNovuError(error: NovuError): ErrorClassification {
    const status = error.status || error.response?.status;
    const message = (error as any).message || (error as any).response?.data?.message || '';
    const code = (error as any).code || (error as any).response?.data?.code || '';

    // Token invalid errors
    if (this.isTokenInvalidError(message, code)) {
      return {
        type: ErrorType.TOKEN_INVALID,
        shouldRetry: false,
        shouldCleanupToken: true,
        shouldMoveToDLQ: false,
        userFriendlyMessage: 'Device token is invalid and has been removed.',
      };
    }

    // Rate limit errors
    if (this.isRateLimitError(message, code, status)) {
      const retryAfter = this.extractRetryAfter(error);
      return {
        type: ErrorType.RATE_LIMITED,
        shouldRetry: true,
        retryAfter,
        shouldMoveToDLQ: false,
        userFriendlyMessage: 'Rate limit exceeded. Retrying after cooldown period.',
      };
    }

    // 5xx server errors (retryable)
    if (status && status >= 500) {
      return {
        type: ErrorType.RETRYABLE,
        shouldRetry: true,
        shouldMoveToDLQ: false,
        userFriendlyMessage: 'Temporary server error. Will retry automatically.',
      };
    }

    // 4xx client errors (mostly non-retryable)
    if (status && status >= 400 && status < 500) {
      // 429 Too Many Requests is retryable
      if (status === 429) {
        const retryAfter = this.extractRetryAfter(error);
        return {
          type: ErrorType.RATE_LIMITED,
          shouldRetry: true,
          retryAfter,
          shouldMoveToDLQ: false,
          userFriendlyMessage: 'Rate limit exceeded. Retrying after cooldown period.',
        };
      }

      return {
        type: ErrorType.NON_RETRYABLE,
        shouldRetry: false,
        shouldMoveToDLQ: true,
        userFriendlyMessage: 'Request error. Please check your data and try again.',
      };
    }

    // Default for other Novu errors
    return {
      type: ErrorType.RETRYABLE,
      shouldRetry: true,
      shouldMoveToDLQ: false,
      userFriendlyMessage: 'Temporary error. Will retry automatically.',
    };
  }

  /**
   * Classify HTTP errors
   */
  private classifyHttpError(error: unknown): ErrorClassification {
    const status = (error as any).status;
    const message = (error as any).message || '';

    // 5xx server errors
    if (status >= 500) {
      return {
        type: ErrorType.RETRYABLE,
        shouldRetry: true,
        shouldMoveToDLQ: false,
        userFriendlyMessage: 'Server error. Will retry automatically.',
      };
    }

    // 4xx client errors
    if (status >= 400 && status < 500) {
      if (status === 429) {
        const retryAfter = this.extractRetryAfter(error);
        return {
          type: ErrorType.RATE_LIMITED,
          shouldRetry: true,
          retryAfter,
          shouldMoveToDLQ: false,
          userFriendlyMessage: 'Rate limit exceeded. Retrying after cooldown period.',
        };
      }

      return {
        type: ErrorType.NON_RETRYABLE,
        shouldRetry: false,
        shouldMoveToDLQ: true,
        userFriendlyMessage: 'Request error. Please check your data and try again.',
      };
    }

    // Other HTTP errors
    return {
      type: ErrorType.RETRYABLE,
      shouldRetry: true,
      shouldMoveToDLQ: false,
      userFriendlyMessage: 'Temporary error. Will retry automatically.',
    };
  }

  /**
   * Classify generic errors
   */
  private classifyGenericError(error: unknown): ErrorClassification {
    const message = (error as any)?.message || (error as any)?.toString() || '';

    // Check for token invalid patterns
    if (this.isTokenInvalidError(message)) {
      return {
        type: ErrorType.TOKEN_INVALID,
        shouldRetry: false,
        shouldCleanupToken: true,
        shouldMoveToDLQ: false,
        userFriendlyMessage: 'Device token is invalid and has been removed.',
      };
    }

    // Check for rate limit patterns
    if (this.isRateLimitError(message)) {
      return {
        type: ErrorType.RATE_LIMITED,
        shouldRetry: true,
        retryAfter: 60, // Default 1 minute
        shouldMoveToDLQ: false,
        userFriendlyMessage: 'Rate limit exceeded. Retrying after cooldown period.',
      };
    }

    // Check for retryable patterns
    if (this.isRetryableError(message)) {
      return {
        type: ErrorType.RETRYABLE,
        shouldRetry: true,
        shouldMoveToDLQ: false,
        userFriendlyMessage: 'Temporary error. Will retry automatically.',
      };
    }

    // Check for non-retryable patterns
    if (this.isNonRetryableError(message)) {
      return {
        type: ErrorType.NON_RETRYABLE,
        shouldRetry: false,
        shouldMoveToDLQ: true,
        userFriendlyMessage: 'Request error. Please check your data and try again.',
      };
    }

    // Default to retryable for unknown errors
    return {
      type: ErrorType.RETRYABLE,
      shouldRetry: true,
      shouldMoveToDLQ: false,
      userFriendlyMessage: 'Temporary error. Will retry automatically.',
    };
  }

  /**
   * Check if error indicates token is invalid
   */
  private isTokenInvalidError(message: string, code?: string): boolean {
    const fullMessage = `${message} ${code || ''}`.toLowerCase();
    return this.tokenInvalidPatterns.some((pattern) => pattern.test(fullMessage));
  }

  /**
   * Check if error indicates rate limiting
   */
  private isRateLimitError(message: string, code?: string, status?: number): boolean {
    if (status === 429) return true;

    const fullMessage = `${message} ${code || ''}`.toLowerCase();
    return this.rateLimitPatterns.some((pattern) => pattern.test(fullMessage));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(message: string): boolean {
    return this.retryablePatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(message: string): boolean {
    return this.nonRetryablePatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Extract retry-after value from error
   */
  private extractRetryAfter(error: unknown): number {
    // Check for Retry-After header
    if ((error as any)?.response?.headers?.['retry-after']) {
      const retryAfter = parseInt((error as any).response.headers['retry-after'], 10);
      if (!isNaN(retryAfter)) {
        return retryAfter;
      }
    }

    // Check for retryAfter in error data
    if ((error as any)?.response?.data?.retryAfter) {
      const retryAfter = parseInt((error as any).response.data.retryAfter, 10);
      if (!isNaN(retryAfter)) {
        return retryAfter;
      }
    }

    // Default retry after values based on error type
    if ((error as any)?.status === 429) {
      return 60; // 1 minute for rate limits
    }

    return 30; // 30 seconds default
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    retryablePatterns: number;
    nonRetryablePatterns: number;
    tokenInvalidPatterns: number;
    rateLimitPatterns: number;
  } {
    return {
      retryablePatterns: this.retryablePatterns.length,
      nonRetryablePatterns: this.nonRetryablePatterns.length,
      tokenInvalidPatterns: this.tokenInvalidPatterns.length,
      rateLimitPatterns: this.rateLimitPatterns.length,
    };
  }
}
