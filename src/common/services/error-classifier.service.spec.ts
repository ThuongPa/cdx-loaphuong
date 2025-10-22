import { Test, TestingModule } from '@nestjs/testing';
import { ErrorClassifierService, ErrorType } from './error-classifier.service';
import { Type } from 'class-transformer';

describe('ErrorClassifierService', () => {
  let service: ErrorClassifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorClassifierService],
    }).compile();

    service = module.get<ErrorClassifierService>(ErrorClassifierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyError', () => {
    it('should classify Novu API errors correctly', () => {
      // Arrange
      const novuError = {
        status: 500,
        message: 'Internal server error',
        response: {
          status: 500,
          data: { error: 'Novu service unavailable' },
        },
      };

      // Act
      const result = service.classifyError(novuError);

      // Assert
      expect(result.type).toBe(ErrorType.RETRYABLE);
      expect(result.shouldRetry).toBe(true);
      expect(result.shouldMoveToDLQ).toBe(false);
      expect(result.userFriendlyMessage).toContain('Temporary server error');
    });

    it('should classify token invalid errors correctly', () => {
      // Arrange
      const tokenError = {
        status: 400,
        message: 'Invalid device token',
        response: {
          status: 400,
          data: { error: 'Token not found' },
        },
      };

      // Act
      const result = service.classifyError(tokenError);

      // Assert
      expect(result.type).toBe(ErrorType.TOKEN_INVALID);
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldCleanupToken).toBe(true);
      expect(result.shouldMoveToDLQ).toBe(false);
      expect(result.userFriendlyMessage).toContain('Device token is invalid');
    });

    it('should classify rate limit errors correctly', () => {
      // Arrange
      const rateLimitError = {
        status: 429,
        message: 'Too many requests',
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
        },
      };

      // Act
      const result = service.classifyError(rateLimitError);

      // Assert
      expect(result.type).toBe(ErrorType.RATE_LIMITED);
      expect(result.shouldRetry).toBe(true);
      expect(result.retryAfter).toBe(60);
      expect(result.shouldMoveToDLQ).toBe(false);
      expect(result.userFriendlyMessage).toContain('Rate limit exceeded');
    });

    it('should classify HTTP 4xx errors as non-retryable', () => {
      // Arrange
      const clientError = {
        status: 400,
        message: 'Bad request',
      };

      // Act
      const result = service.classifyError(clientError);

      // Assert
      expect(result.type).toBe(ErrorType.NON_RETRYABLE);
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldMoveToDLQ).toBe(true);
      expect(result.userFriendlyMessage).toContain('Request error');
    });

    it('should classify HTTP 5xx errors as retryable', () => {
      // Arrange
      const serverError = {
        status: 503,
        message: 'Service unavailable',
      };

      // Act
      const result = service.classifyError(serverError);

      // Assert
      expect(result.type).toBe(ErrorType.RETRYABLE);
      expect(result.shouldRetry).toBe(true);
      expect(result.shouldMoveToDLQ).toBe(false);
      expect(result.userFriendlyMessage).toContain('Temporary server error');
    });

    it('should classify generic timeout errors as retryable', () => {
      // Arrange
      const timeoutError = {
        message: 'Request timeout',
        name: 'TimeoutError',
      };

      // Act
      const result = service.classifyError(timeoutError);

      // Assert
      expect(result.type).toBe(ErrorType.RETRYABLE);
      expect(result.shouldRetry).toBe(true);
      expect(result.shouldMoveToDLQ).toBe(false);
      expect(result.userFriendlyMessage).toContain('Temporary error');
    });

    it('should classify generic network errors as retryable', () => {
      // Arrange
      const networkError = {
        message: 'Network connection failed',
        name: 'NetworkError',
      };

      // Act
      const result = service.classifyError(networkError);

      // Assert
      expect(result.type).toBe(ErrorType.RETRYABLE);
      expect(result.shouldRetry).toBe(true);
      expect(result.shouldMoveToDLQ).toBe(false);
      expect(result.userFriendlyMessage).toContain('Temporary error');
    });

    it('should classify generic validation errors as non-retryable', () => {
      // Arrange
      const validationError = {
        message: 'Validation error: Invalid payload',
        name: 'ValidationError',
      };

      // Act
      const result = service.classifyError(validationError);

      // Assert
      expect(result.type).toBe(ErrorType.NON_RETRYABLE);
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldMoveToDLQ).toBe(true);
      expect(result.userFriendlyMessage).toContain('Request error');
    });

    it('should handle unknown errors gracefully', () => {
      // Arrange
      const unknownError = {
        message: 'Some unknown error',
      };

      // Act
      const result = service.classifyError(unknownError);

      // Assert
      expect(result.type).toBe(ErrorType.RETRYABLE);
      expect(result.shouldRetry).toBe(true);
      expect(result.shouldMoveToDLQ).toBe(false);
      expect(result.userFriendlyMessage).toContain('Temporary error');
    });

    it('should handle classification errors gracefully', () => {
      // Arrange
      const errorThatThrows = {
        get message() {
          throw new Error('Cannot access message');
        },
      };

      // Act
      const result = service.classifyError(errorThatThrows);

      // Assert
      expect(result.type).toBe(ErrorType.NON_RETRYABLE);
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldMoveToDLQ).toBe(true);
      expect(result.userFriendlyMessage).toContain('unexpected error occurred');
    });

    it('should extract retry-after from headers', () => {
      // Arrange
      const rateLimitError = {
        status: 429,
        response: {
          headers: { 'retry-after': '120' },
        },
      };

      // Act
      const result = service.classifyError(rateLimitError);

      // Assert
      expect(result.retryAfter).toBe(120);
    });

    it('should extract retry-after from response data', () => {
      // Arrange
      const rateLimitError = {
        status: 429,
        response: {
          data: { retryAfter: '90' },
        },
      };

      // Act
      const result = service.classifyError(rateLimitError);

      // Assert
      expect(result.retryAfter).toBe(90);
    });

    it('should use default retry-after for 429 errors', () => {
      // Arrange
      const rateLimitError = {
        status: 429,
        message: 'Too many requests',
      };

      // Act
      const result = service.classifyError(rateLimitError);

      // Assert
      expect(result.retryAfter).toBe(60); // Default 1 minute
    });

    it('should use default retry-after for other rate limit errors', () => {
      // Arrange
      const rateLimitError = {
        message: 'Rate limit exceeded',
      };

      // Act
      const result = service.classifyError(rateLimitError);

      // Assert
      expect(result.retryAfter).toBe(60); // Default 1 minute
    });
  });

  describe('getErrorStatistics', () => {
    it('should return error pattern statistics', () => {
      // Act
      const result = service.getErrorStatistics();

      // Assert
      expect(result).toEqual({
        retryablePatterns: expect.any(Number),
        nonRetryablePatterns: expect.any(Number),
        tokenInvalidPatterns: expect.any(Number),
        rateLimitPatterns: expect.any(Number),
      });
      expect(result.retryablePatterns).toBeGreaterThan(0);
      expect(result.nonRetryablePatterns).toBeGreaterThan(0);
      expect(result.tokenInvalidPatterns).toBeGreaterThan(0);
      expect(result.rateLimitPatterns).toBeGreaterThan(0);
    });
  });
});
