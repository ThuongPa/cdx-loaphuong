import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NovuRetryService } from '../../../../../src/infrastructure/external/novu/novu-retry.service';

describe('NovuRetryService', () => {
  let service: NovuRetryService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue({
        retries: 3,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NovuRetryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NovuRetryService>(NovuRetryService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const mockResult = 'success';

      const result = await service.executeWithRetry(mockOperation);

      expect(result).toBe(mockResult);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry operation on failure and succeed on second attempt', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should retry operation multiple times and eventually succeed', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.executeWithRetry(mockOperation)).rejects.toThrow('Network error');
      expect(mockOperation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new Error('Bad Request') as any;
      nonRetryableError.status = 400;
      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(service.executeWithRetry(mockOperation)).rejects.toThrow('Bad Request');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry options', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      const customOptions = {
        maxRetries: 1,
        baseDelay: 100,
        maxDelay: 200,
        backoffMultiplier: 1.5,
      };

      await expect(service.executeWithRetry(mockOperation, customOptions)).rejects.toThrow(
        'Network error',
      );
      expect(mockOperation).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkErrors = [
        { code: 'ECONNRESET' },
        { code: 'ECONNREFUSED' },
        { code: 'ETIMEDOUT' },
        { code: 'ENOTFOUND' },
      ];

      networkErrors.forEach((error) => {
        expect(service['isRetryableError'](error)).toBe(true);
      });
    });

    it('should identify server errors as retryable', () => {
      const serverErrors = [
        { status: 500 },
        { status: 502 },
        { status: 503 },
        { status: 504 },
        { statusCode: 500 },
      ];

      serverErrors.forEach((error) => {
        expect(service['isRetryableError'](error)).toBe(true);
      });
    });

    it('should identify rate limiting as retryable', () => {
      const rateLimitError = { status: 429 };
      expect(service['isRetryableError'](rateLimitError)).toBe(true);
    });

    it('should identify client errors as non-retryable', () => {
      const clientErrors = [{ status: 400 }, { status: 401 }, { status: 403 }, { status: 404 }];

      clientErrors.forEach((error) => {
        expect(service['isRetryableError'](error)).toBe(false);
      });
    });

    it('should identify explicitly marked retryable errors', () => {
      const retryableError = { isRetryable: true };
      expect(service['isRetryableError'](retryableError)).toBe(true);
    });

    it('should identify explicitly marked non-retryable errors', () => {
      const nonRetryableError = { isRetryable: false };
      expect(service['isRetryableError'](nonRetryableError)).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff delay correctly', () => {
      const options = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      };

      expect(service['calculateDelay'](0, options)).toBe(1000); // 1000 * 2^0
      expect(service['calculateDelay'](1, options)).toBe(2000); // 1000 * 2^1
      expect(service['calculateDelay'](2, options)).toBe(4000); // 1000 * 2^2
    });

    it('should respect max delay limit', () => {
      const options = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 2000,
        backoffMultiplier: 2,
      };

      expect(service['calculateDelay'](2, options)).toBe(2000); // Should be capped at maxDelay
    });
  });

  describe('createRetryableError', () => {
    it('should create retryable error with message', () => {
      const error = service.createRetryableError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.isRetryable).toBe(true);
    });

    it('should create retryable error with original error', () => {
      const originalError = new Error('Original error');
      const error = service.createRetryableError('Test error', originalError);

      expect(error.message).toBe('Test error');
      expect(error.isRetryable).toBe(true);
      expect(error.cause).toBe(originalError);
    });
  });

  describe('createNonRetryableError', () => {
    it('should create non-retryable error with message', () => {
      const error = service.createNonRetryableError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.isRetryable).toBe(false);
    });

    it('should create non-retryable error with original error', () => {
      const originalError = new Error('Original error');
      const error = service.createNonRetryableError('Test error', originalError);

      expect(error.message).toBe('Test error');
      expect(error.isRetryable).toBe(false);
      expect(error.cause).toBe(originalError);
    });
  });

  describe('classifyError', () => {
    it('should classify explicitly marked errors', () => {
      const retryableError = { isRetryable: true };
      const nonRetryableError = { isRetryable: false };

      expect(service.classifyError(retryableError)).toEqual({
        isRetryable: true,
        reason: 'Explicitly marked as retryable',
      });

      expect(service.classifyError(nonRetryableError)).toEqual({
        isRetryable: false,
        reason: 'Explicitly marked as non-retryable',
      });
    });

    it('should classify network errors', () => {
      const networkError = { code: 'ECONNRESET' };
      const result = service.classifyError(networkError);

      expect(result.isRetryable).toBe(true);
      expect(result.reason).toBe('Network connectivity issue');
    });

    it('should classify server errors', () => {
      const serverError = { status: 500 };
      const result = service.classifyError(serverError);

      expect(result.isRetryable).toBe(true);
      expect(result.reason).toBe('Server error (500)');
    });

    it('should classify rate limiting', () => {
      const rateLimitError = { status: 429 };
      const result = service.classifyError(rateLimitError);

      expect(result.isRetryable).toBe(true);
      expect(result.reason).toBe('Rate limiting (429)');
    });

    it('should classify client errors', () => {
      const clientError = { status: 400 };
      const result = service.classifyError(clientError);

      expect(result.isRetryable).toBe(false);
      expect(result.reason).toBe('Client error (400)');
    });

    it('should default to retryable for unknown errors', () => {
      const unknownError = { message: 'Unknown error' };
      const result = service.classifyError(unknownError);

      expect(result.isRetryable).toBe(true);
      expect(result.reason).toBe('Unknown error, defaulting to retryable');
    });
  });

  describe('logError', () => {
    it('should log retryable errors as warnings', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      const error = { message: 'Network error', isRetryable: true };

      service.logError(error, 'test context');

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });

    it('should log non-retryable errors as errors', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      const error = { message: 'Bad request', isRetryable: false };

      service.logError(error, 'test context');

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
