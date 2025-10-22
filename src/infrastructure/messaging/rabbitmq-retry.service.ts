import { ConfigService } from '@nestjs/config';
import { Injectable, Res, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries: number;
  delays: number[];
  backoffMultiplier?: number;
}

export interface RetryResult {
  success: boolean;
  attempts: number;
  error?: any;
}

@Injectable()
export class RabbitMQRetryService {
  private readonly logger = new Logger(RabbitMQRetryService.name);
  private readonly defaultOptions: RetryOptions;

  constructor(private readonly configService: ConfigService) {
    const rabbitmqConfig = this.configService.get('rabbitmq');
    this.defaultOptions = {
      maxRetries: parseInt(process.env.RABBITMQ_RETRY_COUNT || '3', 10),
      delays: (process.env.RABBITMQ_RETRY_DELAYS || '100,500,2000')
        .split(',')
        .map((d) => parseInt(d.trim(), 10)),
      backoffMultiplier: 2,
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    context: string = 'RabbitMQ operation',
  ): Promise<RetryResult> {
    const retryOptions = { ...this.defaultOptions, ...options };
    let lastError: any;

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        const result = await operation();

        if (attempt > 0) {
          this.logger.log(`${context} succeeded after ${attempt + 1} attempts`);
        }

        return {
          success: true,
          attempts: attempt + 1,
        };
      } catch (error) {
        lastError = error;

        if (attempt === retryOptions.maxRetries) {
          this.logger.error(
            `${context} failed after ${retryOptions.maxRetries + 1} attempts:`,
            error,
          );
          break;
        }

        const delay = this.calculateDelay(attempt, retryOptions);
        this.logger.warn(
          `${context} failed (attempt ${attempt + 1}/${retryOptions.maxRetries + 1}), retrying in ${delay}ms:`,
          error.message,
        );

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      attempts: retryOptions.maxRetries + 1,
      error: lastError,
    };
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    if (attempt < options.delays.length) {
      return options.delays[attempt];
    }

    // Exponential backoff for additional attempts
    const lastDelay = options.delays[options.delays.length - 1];
    const multiplier = options.backoffMultiplier || 2;
    return lastDelay * Math.pow(multiplier, attempt - options.delays.length + 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return true;
    }

    // RabbitMQ specific errors
    if (
      error.message &&
      (error.message.includes('Connection is closed') ||
        error.message.includes('Channel is closed') ||
        error.message.includes('Socket closed'))
    ) {
      return true;
    }

    // Server errors (5xx)
    if (error.status >= 500) {
      return true;
    }

    // Rate limiting
    if (error.status === 429) {
      return true;
    }

    // Non-retryable errors
    if (error.status >= 400 && error.status < 500) {
      return false;
    }

    // Default to retryable for unknown errors
    return true;
  }
}
