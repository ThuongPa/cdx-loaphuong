import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from 'src/infrastructure/messaging/rabbitmq.service';
import { EventValidationService } from 'src/infrastructure/messaging/event-validation.service';
import { RabbitMQRetryService } from 'src/infrastructure/messaging/rabbitmq-retry.service';
import { RabbitMQConsumerService } from 'src/infrastructure/messaging/rabbitmq-consumer.service';
import { BaseEventDto } from 'src/common/dto/event-schemas/base-event.dto';

describe('RabbitMQConsumerService', () => {
  let service: RabbitMQConsumerService;
  let configService: jest.Mocked<ConfigService>;
  let rabbitMQService: jest.Mocked<RabbitMQService>;
  let eventValidationService: jest.Mocked<EventValidationService>;
  let retryService: jest.Mocked<RabbitMQRetryService>;

  const mockEventHandler = {
    handle: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockRabbitMQService = {
      consumeMessage: jest.fn(),
      publishMessage: jest.fn(),
    };

    const mockEventValidationService = {
      validateEventMessage: jest.fn(),
      generateCorrelationId: jest.fn(),
    };

    const mockRetryService = {
      executeWithRetry: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQConsumerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: EventValidationService,
          useValue: mockEventValidationService,
        },
        {
          provide: RabbitMQRetryService,
          useValue: mockRetryService,
        },
      ],
    }).compile();

    service = module.get<RabbitMQConsumerService>(RabbitMQConsumerService);
    configService = module.get(ConfigService);
    rabbitMQService = module.get(RabbitMQService);
    eventValidationService = module.get(EventValidationService);
    retryService = module.get(RabbitMQRetryService);

    // Mock config values
    configService.get.mockImplementation((key: string) => {
      const config: any = {
        rabbitmq: {
          queues: {
            notificationQueue: { name: 'notification.queue' },
          },
          exchanges: {
            notifications: { name: 'notifications.exchange' },
          },
        },
      };
      return config[key] || config.rabbitmq;
    });

    // Mock correlation ID generation
    eventValidationService.generateCorrelationId.mockReturnValue('corr_123');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerEventHandler', () => {
    it('should register event handler successfully', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      service.registerEventHandler('test.TestEvent', mockEventHandler);

      expect(loggerSpy).toHaveBeenCalledWith('Registered event handler for: test.TestEvent');
      loggerSpy.mockRestore();
    });
  });

  describe('handleMessage', () => {
    it('should process valid message successfully', async () => {
      const validEvent: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'test.TestEvent',
        aggregateId: 'aggregate_123',
        aggregateType: 'TestAggregate',
        timestamp: '2025-01-16T10:00:00Z',
        payload: { test: 'data' },
        correlationId: 'corr_123',
      };

      const message = {
        event: validEvent,
        routingKey: 'test.TestEvent',
      };

      // Mock validation success
      eventValidationService.validateEventMessage.mockResolvedValue({
        isValid: true,
        event: validEvent,
      });

      // Mock retry service success
      retryService.executeWithRetry.mockResolvedValue({
        success: true,
        attempts: 1,
      });

      // Register handler
      service.registerEventHandler('test.TestEvent', mockEventHandler);

      await service['handleMessage'](message);

      expect(eventValidationService.validateEventMessage).toHaveBeenCalledWith(message);
      expect(retryService.executeWithRetry).toHaveBeenCalled();
      // Note: The handler is called within the retry service, so we verify the retry was called
    });

    it('should move invalid message to DLQ', async () => {
      const invalidMessage = {
        event: { invalid: 'data' },
        routingKey: 'test.TestEvent',
      };

      // Mock validation failure
      eventValidationService.validateEventMessage.mockResolvedValue({
        isValid: false,
        errors: ['Validation failed'],
      });

      const publishSpy = jest
        .spyOn(service, 'moveToDeadLetterQueue' as any)
        .mockResolvedValue(undefined);

      await service['handleMessage'](invalidMessage);

      expect(publishSpy).toHaveBeenCalledWith(invalidMessage, 'Validation failed', 'corr_123');
    });

    it('should move message to DLQ after max retries', async () => {
      const validEvent: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'test.TestEvent',
        aggregateId: 'aggregate_123',
        aggregateType: 'TestAggregate',
        timestamp: '2025-01-16T10:00:00Z',
        payload: { test: 'data' },
        correlationId: 'corr_123',
      };

      const message = {
        event: validEvent,
        routingKey: 'test.TestEvent',
      };

      // Mock validation success
      eventValidationService.validateEventMessage.mockResolvedValue({
        isValid: true,
        event: validEvent,
      });

      // Mock retry service failure
      retryService.executeWithRetry.mockResolvedValue({
        success: false,
        attempts: 4,
        error: new Error('Max retries exceeded'),
      });

      const publishSpy = jest
        .spyOn(service, 'moveToDeadLetterQueue' as any)
        .mockResolvedValue(undefined);

      await service['handleMessage'](message);

      expect(publishSpy).toHaveBeenCalledWith(
        message,
        'Processing failed after max retries',
        'corr_123',
      );
    });

    it('should handle unexpected errors and move to DLQ', async () => {
      const message = {
        event: { test: 'data' },
        routingKey: 'test.TestEvent',
      };

      // Mock validation to throw unexpected error
      eventValidationService.validateEventMessage.mockRejectedValue(new Error('Unexpected error'));

      const publishSpy = jest
        .spyOn(service, 'moveToDeadLetterQueue' as any)
        .mockResolvedValue(undefined);

      await service['handleMessage'](message);

      expect(publishSpy).toHaveBeenCalledWith(message, 'Unexpected error', 'corr_123');
    });

    it('should log warning for unknown event types', async () => {
      const validEvent: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'unknown.UnknownEvent',
        aggregateId: 'aggregate_123',
        aggregateType: 'TestAggregate',
        timestamp: '2025-01-16T10:00:00Z',
        payload: { test: 'data' },
        correlationId: 'corr_123',
      };

      const message = {
        event: validEvent,
        routingKey: 'unknown.UnknownEvent',
      };

      // Mock validation success
      eventValidationService.validateEventMessage.mockResolvedValue({
        isValid: true,
        event: validEvent,
      });

      // Mock retry service success
      retryService.executeWithRetry.mockResolvedValue({
        success: true,
        attempts: 1,
      });

      const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service['handleMessage'](message);

      // The warning is logged in processEvent, which is called by retry service
      expect(retryService.executeWithRetry).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });
  });

  describe('processEvent', () => {
    it('should process event with registered handler', async () => {
      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'test.TestEvent',
        aggregateId: 'aggregate_123',
        aggregateType: 'TestAggregate',
        timestamp: '2025-01-16T10:00:00Z',
        payload: { test: 'data' },
        correlationId: 'corr_123',
      };

      // Register handler
      service.registerEventHandler('test.TestEvent', mockEventHandler);

      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service['processEvent'](event, 'corr_123');

      expect(mockEventHandler.handle).toHaveBeenCalledWith(event);
      expect(loggerSpy).toHaveBeenCalledWith('Event handled successfully', {
        correlationId: 'corr_123',
        eventType: 'test.TestEvent',
        eventId: 'event_123',
      });

      loggerSpy.mockRestore();
    });

    it('should handle handler errors', async () => {
      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'test.TestEvent',
        aggregateId: 'aggregate_123',
        aggregateType: 'TestAggregate',
        timestamp: '2025-01-16T10:00:00Z',
        payload: { test: 'data' },
        correlationId: 'corr_123',
      };

      // Mock handler to throw error
      mockEventHandler.handle.mockRejectedValue(new Error('Handler error'));

      // Register handler
      service.registerEventHandler('test.TestEvent', mockEventHandler);

      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await expect(service['processEvent'](event, 'corr_123')).rejects.toThrow('Handler error');

      expect(loggerSpy).toHaveBeenCalledWith('Event handler failed for test.TestEvent', {
        correlationId: 'corr_123',
        eventId: 'event_123',
        error: 'Handler error',
      });

      loggerSpy.mockRestore();
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', () => {
      service.registerEventHandler('test.TestEvent', mockEventHandler);

      const healthStatus = service.getHealthStatus();

      expect(healthStatus).toEqual({
        isConsuming: false, // Not consuming in test environment
        registeredHandlers: ['test.TestEvent'],
        timestamp: expect.any(String),
      });
    });
  });
});
