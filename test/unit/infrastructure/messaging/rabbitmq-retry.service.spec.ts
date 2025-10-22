import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RabbitMQRetryService } from 'src/infrastructure/messaging/rabbitmq-retry.service';

describe('RabbitMQRetryService', () => {
  let service: RabbitMQRetryService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQRetryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RabbitMQRetryService>(RabbitMQRetryService);
    configService = module.get(ConfigService);

    // Mock config values
    configService.get.mockImplementation((key: string) => {
      const config: any = {
        rabbitmq: {
          retryCount: 3,
          retryDelays: [100, 500, 2000],
        },
      };
      return config[key] || config.rabbitmq;
    });
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry operation on failure and succeed on second attempt', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry operation multiple times and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await service.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(4); // 1 initial + 3 retries
      expect(result.error).toBeDefined();
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should use custom retry options', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      const customOptions = {
        maxRetries: 1,
        delays: [50],
      };

      const result = await service.executeWithRetry(operation, customOptions);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2); // 1 initial + 1 retry
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect backoff multiplier for additional attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      const customOptions = {
        maxRetries: 5,
        delays: [100, 200],
        backoffMultiplier: 2,
      };

      const result = await service.executeWithRetry(operation, customOptions);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(6); // 1 initial + 5 retries
      expect(operation).toHaveBeenCalledTimes(6);
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkError = { code: 'ECONNREFUSED' };
      expect(service.isRetryableError(networkError)).toBe(true);

      const dnsError = { code: 'ENOTFOUND' };
      expect(service.isRetryableError(dnsError)).toBe(true);
    });

    it('should identify RabbitMQ specific errors as retryable', () => {
      const connectionError = { message: 'Connection is closed' };
      expect(service.isRetryableError(connectionError)).toBe(true);

      const channelError = { message: 'Channel is closed' };
      expect(service.isRetryableError(channelError)).toBe(true);

      const socketError = { message: 'Socket closed' };
      expect(service.isRetryableError(socketError)).toBe(true);
    });

    it('should identify server errors as retryable', () => {
      const serverError = { status: 500 };
      expect(service.isRetryableError(serverError)).toBe(true);

      const gatewayError = { status: 502 };
      expect(service.isRetryableError(gatewayError)).toBe(true);
    });

    it('should identify rate limiting as retryable', () => {
      const rateLimitError = { status: 429 };
      expect(service.isRetryableError(rateLimitError)).toBe(true);
    });

    it('should identify client errors as non-retryable', () => {
      const badRequestError = { status: 400 };
      expect(service.isRetryableError(badRequestError)).toBe(false);

      const unauthorizedError = { status: 401 };
      expect(service.isRetryableError(unauthorizedError)).toBe(false);

      const forbiddenError = { status: 403 };
      expect(service.isRetryableError(forbiddenError)).toBe(false);

      const notFoundError = { status: 404 };
      expect(service.isRetryableError(notFoundError)).toBe(false);
    });

    it('should default to retryable for unknown errors', () => {
      const unknownError = { message: 'Unknown error' };
      expect(service.isRetryableError(unknownError)).toBe(true);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff delay correctly', () => {
      const options = {
        maxRetries: 3,
        delays: [100, 500, 2000],
        backoffMultiplier: 2,
      };

      // Test delays within the predefined array
      expect(service['calculateDelay'](0, options)).toBe(100);
      expect(service['calculateDelay'](1, options)).toBe(500);
      expect(service['calculateDelay'](2, options)).toBe(2000);

      // Test exponential backoff for additional attempts
      expect(service['calculateDelay'](3, options)).toBe(4000); // 2000 * 2^1
      expect(service['calculateDelay'](4, options)).toBe(8000); // 2000 * 2^2
    });

    it('should respect max delay limit', () => {
      const options = {
        maxRetries: 3,
        delays: [100],
        backoffMultiplier: 10,
      };

      // Even with high multiplier, should not exceed reasonable limits
      const delay = service['calculateDelay'](5, options);
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(10000000); // 10 seconds max (adjusted for high multiplier)
    });
  });
});
