import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from 'src/infrastructure/messaging/rabbitmq.module';
import { RabbitMQConsumerService } from 'src/infrastructure/messaging/rabbitmq-consumer.service';
import { EventValidationService } from 'src/infrastructure/messaging/event-validation.service';
import { RabbitMQRetryService } from 'src/infrastructure/messaging/rabbitmq-retry.service';
import { RabbitMQConfig } from 'src/config/rabbitmq.config';
import { BaseEventDto } from 'src/common/dto/event-schemas/base-event.dto';

describe('RabbitMQConsumerService Integration', () => {
  let module: TestingModule;
  let consumerService: RabbitMQConsumerService;
  let validationService: EventValidationService;
  let retryService: RabbitMQRetryService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [RabbitMQConfig],
        }),
        RabbitMQModule,
      ],
    }).compile();

    consumerService = module.get<RabbitMQConsumerService>(RabbitMQConsumerService);
    validationService = module.get<EventValidationService>(EventValidationService);
    retryService = module.get<RabbitMQRetryService>(RabbitMQRetryService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Event Validation Integration', () => {
    it('should validate feedback created event successfully', async () => {
      const validEvent: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: '2025-01-16T10:00:00Z',
        payload: {
          feedbackId: 'feedback_123',
          title: 'Test Feedback',
          description: 'Test Description',
          userId: 'user_123',
          categoryId: 'category_123',
          priority: 'high',
        },
        correlationId: 'corr_123',
      };

      const message = validEvent;

      const result = await validationService.validateEventMessage(message);

      expect(result.isValid).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event?.eventId).toBe('event_123');
      expect(result.event?.eventType).toBe('feedback.FeedbackCreatedEvent');
    });

    it('should validate auth user created event successfully', async () => {
      const validEvent: BaseEventDto = {
        eventId: 'event_456',
        eventType: 'auth.UserCreatedEvent',
        aggregateId: 'user_456',
        aggregateType: 'User',
        timestamp: '2025-01-16T10:00:00Z',
        payload: {
          userId: 'user_456',
          email: 'test@example.com',
          roles: ['resident'],
          createdBy: 'user_789',
        },
        correlationId: 'corr_456',
      };

      const message = validEvent;

      const result = await validationService.validateEventMessage(message);

      expect(result.isValid).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event?.eventId).toBe('event_456');
      expect(result.event?.eventType).toBe('auth.UserCreatedEvent');
    });

    it('should reject invalid event message', async () => {
      const invalidMessage = {
        event: {
          eventId: 'event_123',
          // Missing required fields
        },
      };

      const result = await validationService.validateEventMessage(invalidMessage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Retry Service Integration', () => {
    it('should execute operation successfully on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryService.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry operation on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValue('success');

      const result = await retryService.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should identify retryable errors correctly', () => {
      const networkError = { code: 'ECONNREFUSED' };
      const clientError = { status: 400 };
      const serverError = { status: 500 };

      expect(retryService.isRetryableError(networkError)).toBe(true);
      expect(retryService.isRetryableError(clientError)).toBe(false);
      expect(retryService.isRetryableError(serverError)).toBe(true);
    });
  });

  describe('Consumer Service Integration', () => {
    it('should register event handler successfully', () => {
      const mockHandler = {
        handle: jest.fn(),
      };

      consumerService.registerEventHandler('test.TestEvent', mockHandler);

      const healthStatus = consumerService.getHealthStatus();
      expect(healthStatus.registeredHandlers).toContain('test.TestEvent');
    });

    it('should return health status with correct structure', () => {
      const healthStatus = consumerService.getHealthStatus();

      expect(healthStatus).toHaveProperty('isConsuming');
      expect(healthStatus).toHaveProperty('registeredHandlers');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(Array.isArray(healthStatus.registeredHandlers)).toBe(true);
      expect(typeof healthStatus.isConsuming).toBe('boolean');
      expect(typeof healthStatus.timestamp).toBe('string');
    });
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = validationService.generateCorrelationId();
      const id2 = validationService.generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^corr_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^corr_\d+_[a-z0-9]+$/);
    });

    it('should generate correlation IDs with correct format', () => {
      const correlationId = validationService.generateCorrelationId();

      expect(correlationId).toMatch(/^corr_\d+_[a-z0-9]{9}$/);
    });
  });
});
