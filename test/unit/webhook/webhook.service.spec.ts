import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebhookService } from '../../../src/modules/notification/webhook/webhook.service';
import { WebhookRepository } from '../../../src/modules/notification/webhook/webhook.repository';
import { Webhook, WebhookDocument } from '../../../src/modules/notification/webhook/webhook.schema';
import {
  WebhookDelivery,
  WebhookDeliveryDocument,
} from '../../../src/modules/notification/webhook/webhook-delivery.schema';
import { StructuredLoggerService } from '../../../src/infrastructure/logging/structured-logger.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('WebhookService', () => {
  let service: WebhookService;
  let repository: WebhookRepository;
  let webhookModel: Model<WebhookDocument>;
  let deliveryModel: Model<WebhookDeliveryDocument>;
  let structuredLogger: StructuredLoggerService;

  const mockWebhook = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Webhook',
    description: 'Test Description',
    url: 'https://example.com/webhook',
    eventTypes: ['NOTIFICATION_SENT'] as any,
    status: 'active' as any,
    isActive: true,
    headers: {},
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 30000,
    },
    successCount: 0,
    failureCount: 0,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDelivery = {
    _id: '507f1f77bcf86cd799439012',
    webhookId: '507f1f77bcf86cd799439011',
    eventType: 'notification.sent',
    eventId: 'event123',
    payload: { message: 'test' },
    status: 'pending' as any,
    method: 'POST',
    url: 'https://example.com/webhook',
    headers: {},
    attempts: [],
    attemptCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWebhookModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDeliveryModel = {
    findById: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findMany: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    findActiveWebhooksByEventType: jest.fn(),
    updateWebhookStats: jest.fn(),
    getWebhookStatistics: jest.fn(),
    createDelivery: jest.fn(),
    findDeliveryById: jest.fn(),
    findDeliveriesByWebhook: jest.fn(),
    findDeliveriesByEventId: jest.fn(),
    findManyDeliveries: jest.fn(),
    updateDeliveryStatus: jest.fn(),
    addDeliveryAttempt: jest.fn(),
    findPendingDeliveries: jest.fn(),
    findFailedDeliveriesForRetry: jest.fn(),
    getDeliveryStatistics: jest.fn(),
    cleanupExpiredDeliveries: jest.fn(),
  };

  const mockStructuredLogger = {
    logBusinessEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: WebhookRepository,
          useValue: mockRepository,
        },
        {
          provide: getModelToken(Webhook.name),
          useValue: mockWebhookModel,
        },
        {
          provide: getModelToken(WebhookDelivery.name),
          useValue: mockDeliveryModel,
        },
        {
          provide: StructuredLoggerService,
          useValue: mockStructuredLogger,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    repository = module.get<WebhookRepository>(WebhookRepository);
    webhookModel = module.get<Model<WebhookDocument>>(getModelToken(Webhook.name));
    deliveryModel = module.get<Model<WebhookDeliveryDocument>>(getModelToken(WebhookDelivery.name));
    structuredLogger = module.get<StructuredLoggerService>(StructuredLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebhook', () => {
    it('should create a webhook successfully', async () => {
      const createDto = {
        name: 'Test Webhook',
        description: 'Test Description',
        url: 'https://example.com/webhook',
        eventTypes: ['NOTIFICATION_SENT'] as any,
        headers: { 'X-Custom': 'value' },
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2,
          maxRetryDelay: 30000,
        },
        secret: 'secret123',
        metadata: { source: 'test' },
      };

      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockWebhook);

      const result = await service.createWebhook(createDto, 'system');

      expect(mockRepository.findByName).toHaveBeenCalledWith('Test Webhook');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Webhook',
          description: 'Test Description',
          url: 'https://example.com/webhook',
          eventTypes: ['NOTIFICATION_SENT'] as any,
          isActive: true,
          status: 'active' as any,
          successCount: 0,
          failureCount: 0,
          createdBy: 'system',
        }),
      );
      expect(result).toEqual(mockWebhook);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'webhook_created',
        expect.any(Object),
      );
    });

    it('should throw ConflictException if webhook name already exists', async () => {
      const createDto = {
        name: 'Existing Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['NOTIFICATION_SENT'] as any,
      };

      mockRepository.findByName.mockResolvedValue(mockWebhook);

      await expect(service.createWebhook(createDto, 'system')).rejects.toThrow(ConflictException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid URL', async () => {
      const createDto = {
        name: 'Test Webhook',
        url: 'invalid-url',
        eventTypes: ['NOTIFICATION_SENT'] as any,
      };

      mockRepository.findByName.mockResolvedValue(null);

      await expect(service.createWebhook(createDto, 'system')).rejects.toThrow(BadRequestException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getWebhookById', () => {
    it('should return webhook if found', async () => {
      mockRepository.findById.mockResolvedValue(mockWebhook);

      const result = await service.getWebhookById('507f1f77bcf86cd799439011');

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockWebhook);
    });

    it('should throw NotFoundException if webhook not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getWebhookById('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook successfully', async () => {
      const updateDto = {
        name: 'Updated Webhook',
        description: 'Updated Description',
      };

      mockRepository.findById.mockResolvedValue(mockWebhook);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.updateById.mockResolvedValue({ ...mockWebhook, ...updateDto });

      const result = await service.createWebhook(updateDto, 'system');

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRepository.updateById).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        ...updateDto,
        updatedBy: 'system',
      });
      expect(result).toEqual({ ...mockWebhook, ...updateDto });
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'webhook_updated',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if webhook not found', async () => {
      const updateDto = { name: 'Updated Webhook' };

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.createWebhook(updateDto, 'system'),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepository.updateById).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new name already exists', async () => {
      const updateDto = { name: 'Existing Webhook' };

      mockRepository.findById.mockResolvedValue(mockWebhook);
      mockRepository.findByName.mockResolvedValue(mockWebhook);

      await expect(
        service.createWebhook(updateDto, 'system'),
      ).rejects.toThrow(ConflictException);
      expect(mockRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockWebhook);
      mockRepository.deleteById.mockResolvedValue(true);

      await service.createWebhook({} as any, 'system');

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRepository.deleteById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'webhook_deleted',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if webhook not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.createWebhook({} as any, 'system')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe('triggerWebhook', () => {
    it('should trigger webhook successfully', async () => {
      const deliveryDto = {
        webhookId: '507f1f77bcf86cd799439011',
        eventType: 'notification.sent',
        eventId: 'event123',
        payload: { message: 'test' },
        method: 'POST' as const,
        headers: { 'X-Custom': 'value' },
        scheduledAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        metadata: { source: 'test' },
      };

      mockRepository.findById.mockResolvedValue(mockWebhook);
      mockRepository.createDelivery.mockResolvedValue(mockDelivery);

      const result = await service.createWebhook(deliveryDto, 'system');

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRepository.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookId: mockWebhook._id,
          eventType: 'notification.sent',
          eventId: 'event123',
          payload: { message: 'test' },
          method: 'POST',
          status: 'pending' as any,
        }),
      );
      expect(result).toEqual(mockDelivery);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'webhook_triggered',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if webhook not found', async () => {
      const deliveryDto = {
        webhookId: '507f1f77bcf86cd799439011',
        eventType: 'notification.sent',
        eventId: 'event123',
        payload: { message: 'test' },
      };

      mockRepository.findById.mockResolvedValue(null);

      await expect(service.createWebhook(deliveryDto, 'system')).rejects.toThrow(NotFoundException);
      expect(mockRepository.createDelivery).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if webhook is not active', async () => {
      const deliveryDto = {
        webhookId: '507f1f77bcf86cd799439011',
        eventType: 'notification.sent',
        eventId: 'event123',
        payload: { message: 'test' },
      };

      const inactiveWebhook = { ...mockWebhook, isActive: false };

      mockRepository.findById.mockResolvedValue(inactiveWebhook);

      await expect(service.createWebhook(deliveryDto, 'system')).rejects.toThrow(BadRequestException);
      expect(mockRepository.createDelivery).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if webhook does not support event type', async () => {
      const deliveryDto = {
        webhookId: '507f1f77bcf86cd799439011',
        eventType: 'notification.read',
        eventId: 'event123',
        payload: { message: 'test' },
      };

      mockRepository.findById.mockResolvedValue(mockWebhook);

      await expect(service.createWebhook(deliveryDto, 'system')).rejects.toThrow(BadRequestException);
      expect(mockRepository.createDelivery).not.toHaveBeenCalled();
    });
  });

  describe('getDeliveries', () => {
    it('should return deliveries with pagination', async () => {
      const mockResult = {
        deliveries: [mockDelivery],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockRepository.findManyDeliveries.mockResolvedValue(mockResult);

      const result = await service.createWebhook({} as any, 'system');

      expect(mockRepository.findManyDeliveries).toHaveBeenCalledWith(
        {},
        { field: 'createdAt', order: 'desc' },
        { page: 1, limit: 10 },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getDeliveryById', () => {
    it('should return delivery if found', async () => {
      mockRepository.findDeliveryById.mockResolvedValue(mockDelivery);

      const result = await service.createWebhook('507f1f77bcf86cd799439012' as any, 'system');

      expect(mockRepository.findDeliveryById).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
      expect(result).toEqual(mockDelivery);
    });

    it('should throw NotFoundException if delivery not found', async () => {
      mockRepository.findDeliveryById.mockResolvedValue(null);

      await expect(service.createWebhook('507f1f77bcf86cd799439012')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update delivery status successfully', async () => {
      const updatedDelivery = { ...mockDelivery, status: 'delivered' as any };

      mockRepository.updateDeliveryStatus.mockResolvedValue(updatedDelivery);

      const result = await service.createWebhook('507f1f77bcf86cd799439012' as any, 'delivered');

      expect(mockRepository.updateDeliveryStatus).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        'delivered',
        {},
      );
      expect(result).toEqual(updatedDelivery);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'webhook_delivery_status_updated',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if delivery not found', async () => {
      mockRepository.updateDeliveryStatus.mockResolvedValue(null);

      await expect(
        service.createWebhook('507f1f77bcf86cd799439012', 'delivered'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addDeliveryAttempt', () => {
    it('should add delivery attempt successfully', async () => {
      const attempt = {
        attemptNumber: 1,
        timestamp: new Date(),
        status: 'delivered' as any as any,
        responseCode: 200,
        responseBody: 'OK',
        duration: 150,
      };

      const updatedDelivery = { ...mockDelivery, attempts: [attempt] };

      mockRepository.addDeliveryAttempt.mockResolvedValue(updatedDelivery);

      const result = await service.createWebhook('507f1f77bcf86cd799439012', attempt);

      expect(mockRepository.addDeliveryAttempt).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        attempt,
      );
      expect(result).toEqual(updatedDelivery);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'webhook_delivery_attempt',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if delivery not found', async () => {
      const attempt = {
        attemptNumber: 1,
        timestamp: new Date(),
        status: 'delivered' as any as any,
        duration: 150,
      };

      mockRepository.addDeliveryAttempt.mockResolvedValue(null);

      await expect(service.createWebhook('507f1f77bcf86cd799439012', attempt)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getWebhookStatistics', () => {
    it('should return webhook statistics', async () => {
      const mockStats = {
        totalWebhooks: 10,
        activeWebhooks: 8,
        totalSuccessCount: 100,
        totalFailureCount: 5,
        avgSuccessRate: 0.95,
      };

      mockRepository.getWebhookStatistics.mockResolvedValue([mockStats]);

      const result = await service.createWebhook({} as any, 'system');

      expect(mockRepository.getWebhookStatistics).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockStats);
    });

    it('should return default statistics if no data', async () => {
      mockRepository.getWebhookStatistics.mockResolvedValue([]);

      const result = await service.createWebhook({} as any, 'system');

      expect(result).toEqual({
        totalWebhooks: 0,
        activeWebhooks: 0,
        totalSuccessCount: 0,
        totalFailureCount: 0,
        avgSuccessRate: 0,
      });
    });
  });

  describe('getDeliveryStatistics', () => {
    it('should return delivery statistics', async () => {
      const mockStats = {
        totalDeliveries: 100,
        pendingDeliveries: 5,
        sentDeliveries: 10,
        deliveredDeliveries: 80,
        failedDeliveries: 5,
        avgAttemptCount: 1.2,
        avgDuration: 150,
      };

      mockRepository.getDeliveryStatistics.mockResolvedValue([mockStats]);

      const result = await service.createWebhook({} as any, 'system');

      expect(mockRepository.getDeliveryStatistics).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockStats);
    });

    it('should return default statistics if no data', async () => {
      mockRepository.getDeliveryStatistics.mockResolvedValue([]);

      const result = await service.createWebhook({} as any, 'system');

      expect(result).toEqual({
        totalDeliveries: 0,
        pendingDeliveries: 0,
        sentDeliveries: 0,
        deliveredDeliveries: 0,
        failedDeliveries: 0,
        avgAttemptCount: 0,
        avgDuration: 0,
      });
    });
  });

  describe('cleanupExpiredDeliveries', () => {
    it('should cleanup expired deliveries', async () => {
      mockRepository.cleanupExpiredDeliveries.mockResolvedValue(5);

      const result = await service.createWebhook({} as any, 'system');

      expect(mockRepository.cleanupExpiredDeliveries).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });
});
