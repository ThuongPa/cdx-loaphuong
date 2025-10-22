import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NovuClient } from '../../../../../src/infrastructure/external/novu/novu.client';
import { CircuitBreakerService } from '../../../../../src/infrastructure/external/circuit-breaker/circuit-breaker.service';
import { NovuRetryService } from '../../../../../src/infrastructure/external/novu/novu-retry.service';
import { Novu } from '@novu/api';

// Mock Novu
jest.mock('@novu/api');
const MockedNovu = Novu as jest.MockedClass<typeof Novu>;

describe('NovuClient', () => {
  let service: NovuClient;
  let configService: jest.Mocked<ConfigService>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;
  let retryService: jest.Mocked<NovuRetryService>;
  let mockNovuApi: jest.Mocked<Novu>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue({
        apiKey: 'test-api-key',
        apiUrl: 'http://localhost:3001',
        applicationIdentifier: 'test-app',
        timeout: 30000,
        retries: 3,
      }),
    };

    const mockCircuitBreakerService = {
      execute: jest.fn(),
    };

    const mockRetryService = {
      executeWithRetry: jest.fn(),
      logError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NovuClient,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
        {
          provide: NovuRetryService,
          useValue: mockRetryService,
        },
      ],
    }).compile();

    service = module.get<NovuClient>(NovuClient);
    configService = module.get(ConfigService);
    circuitBreakerService = module.get(CircuitBreakerService);
    retryService = module.get(NovuRetryService);

    // Mock NovuApi instance
    mockNovuApi = {
      events: {
        trigger: jest.fn(),
      },
      subscribers: {
        identify: jest.fn(),
        update: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      },
      notificationTemplates: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
      },
    } as any;

    // Mock the constructor to return our mock
    MockedNovu.mockImplementation(() => mockNovuApi);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const notification = {
        templateId: 'test-template',
        recipient: 'user123',
        data: { message: 'Hello World' },
        channel: 'push',
      };

      const mockResult = undefined;
      circuitBreakerService.execute.mockResolvedValue(mockResult);
      retryService.executeWithRetry.mockResolvedValue(mockResult);

      await service.sendNotification(notification);

      expect(circuitBreakerService.execute).toHaveBeenCalledWith('novu', expect.any(Function), {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      });
    });

    it('should handle notification sending failure', async () => {
      const notification = {
        templateId: 'test-template',
        recipient: 'user123',
        data: { message: 'Hello World' },
        channel: 'push',
      };

      const error = new Error('Failed to send notification');
      circuitBreakerService.execute.mockRejectedValue(error);

      await expect(service.sendNotification(notification)).rejects.toThrow(error);
    });
  });

  describe('createSubscriber', () => {
    it('should create subscriber successfully', async () => {
      const subscriber = {
        subscriberId: 'user123',
        email: 'test@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        data: { role: 'user' },
      };

      const mockResult = undefined;
      circuitBreakerService.execute.mockResolvedValue(mockResult);
      retryService.executeWithRetry.mockResolvedValue(mockResult);

      await service.createSubscriber(subscriber);

      expect(circuitBreakerService.execute).toHaveBeenCalledWith('novu', expect.any(Function), {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      });
    });

    it('should handle subscriber creation failure', async () => {
      const subscriber = {
        subscriberId: 'user123',
        email: 'test@example.com',
      };

      const error = new Error('Failed to create subscriber');
      circuitBreakerService.execute.mockRejectedValue(error);

      await expect(service.createSubscriber(subscriber)).rejects.toThrow(error);
    });
  });

  describe('updateSubscriber', () => {
    it('should update subscriber successfully', async () => {
      const subscriberId = 'user123';
      const data = {
        email: 'newemail@example.com',
        firstName: 'Jane',
      };

      const mockResult = undefined;
      circuitBreakerService.execute.mockResolvedValue(mockResult);
      retryService.executeWithRetry.mockResolvedValue(mockResult);

      await service.updateSubscriber(subscriberId, data);

      expect(circuitBreakerService.execute).toHaveBeenCalledWith('novu', expect.any(Function), {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      });
    });
  });

  describe('getSubscriber', () => {
    it('should get subscriber successfully', async () => {
      const subscriberId = 'user123';
      const mockSubscriber = {
        subscriberId: 'user123',
        email: 'test@example.com',
      };

      circuitBreakerService.execute.mockResolvedValue(mockSubscriber);
      retryService.executeWithRetry.mockResolvedValue(mockSubscriber);

      const result = await service.getSubscriber(subscriberId);

      expect(result).toEqual(mockSubscriber);
      expect(circuitBreakerService.execute).toHaveBeenCalledWith('novu', expect.any(Function), {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      });
    });
  });

  describe('deleteSubscriber', () => {
    it('should delete subscriber successfully', async () => {
      const subscriberId = 'user123';

      const mockResult = undefined;
      circuitBreakerService.execute.mockResolvedValue(mockResult);
      retryService.executeWithRetry.mockResolvedValue(mockResult);

      await service.deleteSubscriber(subscriberId);

      expect(circuitBreakerService.execute).toHaveBeenCalledWith('novu', expect.any(Function), {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      });
    });
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      const template = {
        name: 'Test Template',
        type: 'push',
        channel: 'push',
        body: 'Hello {{name}}',
        variables: ['name'],
      };

      const mockTemplateId = 'template_123';
      circuitBreakerService.execute.mockResolvedValue(mockTemplateId);
      retryService.executeWithRetry.mockResolvedValue(mockTemplateId);

      const result = await service.createTemplate(template);

      expect(result).toBe(mockTemplateId);
      expect(circuitBreakerService.execute).toHaveBeenCalledWith('novu', expect.any(Function), {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      });
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const templateId = 'template_123';
      const template = {
        name: 'Updated Template',
        body: 'Updated content',
      };

      const mockResult = undefined;
      circuitBreakerService.execute.mockResolvedValue(mockResult);
      retryService.executeWithRetry.mockResolvedValue(mockResult);

      await service.updateTemplate(templateId, template);

      expect(circuitBreakerService.execute).toHaveBeenCalledWith('novu', expect.any(Function), {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      const templateId = 'template_123';

      const mockResult = undefined;
      circuitBreakerService.execute.mockResolvedValue(mockResult);
      retryService.executeWithRetry.mockResolvedValue(mockResult);

      await service.deleteTemplate(templateId);

      expect(circuitBreakerService.execute).toHaveBeenCalledWith('novu', expect.any(Function), {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      });
    });
  });

  describe('getTemplate', () => {
    it('should get template successfully', async () => {
      const templateId = 'template_123';
      const mockTemplate = {
        _id: templateId,
        name: 'Test Template',
      };

      circuitBreakerService.execute.mockResolvedValue(mockTemplate);
      retryService.executeWithRetry.mockResolvedValue(mockTemplate);

      const result = await service.getTemplate(templateId);

      expect(result).toEqual(mockTemplate);
    });
  });

  describe('listTemplates', () => {
    it('should list templates successfully', async () => {
      const mockTemplates = [
        { _id: 'template_1', name: 'Template 1' },
        { _id: 'template_2', name: 'Template 2' },
      ];

      circuitBreakerService.execute.mockResolvedValue(mockTemplates);
      retryService.executeWithRetry.mockResolvedValue(mockTemplates);

      const result = await service.listTemplates();

      expect(result).toEqual(mockTemplates);
    });
  });
});
