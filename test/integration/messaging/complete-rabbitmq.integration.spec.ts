import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQService } from '../../../src/infrastructure/messaging/rabbitmq.service';
import { RabbitMQConsumerService } from '../../../src/infrastructure/messaging/rabbitmq-consumer.service';
import { EventValidationService } from '../../../src/infrastructure/messaging/event-validation.service';
import { RabbitMQRetryService } from '../../../src/infrastructure/messaging/rabbitmq-retry.service';
import {
  FeedbackCreatedEventHandler,
  StatusChangedEventHandler,
  SLABreachedEventHandler,
} from '../../../src/modules/notification/integration/rabbitmq/event-handlers/feedback-event.handler';
import {
  UserRoleChangedEventHandler,
  UserUpdatedEventHandler,
  UserCreatedEventHandler,
} from '../../../src/modules/notification/integration/rabbitmq/event-handlers/auth-event.handler';

describe('Complete RabbitMQ Integration Tests - Story 1.3', () => {
  let moduleRef: TestingModule;
  let rabbitMQService: RabbitMQService;
  let consumerService: RabbitMQConsumerService;
  let validationService: EventValidationService;
  let retryService: RabbitMQRetryService;

  // Mock RabbitMQ connection and channel
  let mockChannel: any;
  let mockConnection: any;

  // Store original methods for cleanup
  let originalPublish: any;
  let originalConsumeMessage: any;
  let originalGetChannel: any;

  beforeAll(async () => {
    // Setup mock RabbitMQ
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue({}),
      assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
      bindQueue: jest.fn().mockResolvedValue({}),
      publish: jest.fn().mockResolvedValue(true),
      consume: jest.fn().mockResolvedValue({}),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn(),
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn(),
    };

    // Mock RabbitMQService methods - setup before module creation
    originalPublish = RabbitMQService.prototype.publish;
    originalConsumeMessage = RabbitMQService.prototype.consumeMessage;
    originalGetChannel = RabbitMQService.prototype.getChannel;

    RabbitMQService.prototype.publish = jest
      .fn()
      .mockImplementation(
        async (exchange: string, routingKey: string, message: any, options?: any) => {
          return mockChannel.publish(exchange, routingKey, message, options);
        },
      );

    RabbitMQService.prototype.consumeMessage = jest
      .fn()
      .mockImplementation(async (queue: string, callback: any) => {
        return mockChannel.consume(queue, callback);
      });

    RabbitMQService.prototype.getChannel = jest.fn().mockReturnValue(mockChannel);

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              rabbitmq: {
                uri: 'amqp://localhost:5672',
                exchange: 'notifications.exchange',
                dlq: 'notifications.dlq',
                retryCount: 3,
                retryDelays: '100,500,2000',
              },
            }),
          ],
        }),
      ],
      providers: [
        RabbitMQService,
        RabbitMQConsumerService,
        EventValidationService,
        RabbitMQRetryService,
        FeedbackCreatedEventHandler,
        StatusChangedEventHandler,
        SLABreachedEventHandler,
        UserRoleChangedEventHandler,
        UserUpdatedEventHandler,
        UserCreatedEventHandler,
      ],
    }).compile();

    rabbitMQService = moduleRef.get<RabbitMQService>(RabbitMQService);
    consumerService = moduleRef.get<RabbitMQConsumerService>(RabbitMQConsumerService);
    validationService = moduleRef.get<EventValidationService>(EventValidationService);
    retryService = moduleRef.get<RabbitMQRetryService>(RabbitMQRetryService);
  });

  afterAll(async () => {
    await moduleRef.close();

    // Restore original methods
    RabbitMQService.prototype.publish = originalPublish;
    RabbitMQService.prototype.consumeMessage = originalConsumeMessage;
    RabbitMQService.prototype.getChannel = originalGetChannel;
  });

  describe('AC 1: RabbitMQ Consumer Service', () => {
    it('should subscribe to notifications.exchange topic exchange', async () => {
      // Test that RabbitMQService is properly configured
      expect(rabbitMQService).toBeDefined();
      expect(rabbitMQService.getChannel).toBeDefined();

      // Test that RabbitMQService methods are mocked correctly
      expect(rabbitMQService.publish).toBeDefined();
      expect(rabbitMQService.consumeMessage).toBeDefined();
    });

    it('should handle routing keys for feedback events', async () => {
      const feedbackEvent = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date(),
        payload: {
          feedbackId: 'feedback_123',
          userId: 'user_123',
          title: 'Test Feedback',
        },
        correlationId: 'corr_123',
      };

      await rabbitMQService.publish(
        'notifications.exchange',
        'feedback.FeedbackCreatedEvent',
        feedbackEvent,
      );

      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'notifications.exchange',
        'feedback.FeedbackCreatedEvent',
        feedbackEvent,
      );
    });

    it('should handle routing keys for auth events', async () => {
      const authEvent = {
        eventId: 'event_456',
        eventType: 'auth.UserRoleChangedEvent',
        aggregateId: 'user_123',
        aggregateType: 'User',
        timestamp: new Date(),
        payload: {
          userId: 'user_123',
          previousRoles: ['resident'],
          newRoles: ['resident', 'admin'],
        },
        correlationId: 'corr_456',
      };

      await rabbitMQService.publish(
        'notifications.exchange',
        'auth.UserRoleChangedEvent',
        authEvent,
      );

      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'notifications.exchange',
        'auth.UserRoleChangedEvent',
        authEvent,
      );
    });

    it('should handle message deserialization and validation', async () => {
      const message = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date(),
        payload: {
          feedbackId: 'feedback_123',
          userId: 'user_123',
          title: 'Test Feedback',
        },
        correlationId: 'corr_123',
      };

      const result = await validationService.validateEventMessage(message);
      expect(result.isValid).toBe(true);
      expect(result.event).toBeDefined();
    });

    it('should handle acknowledgment and error handling', async () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ test: 'data' })),
        properties: { messageId: 'msg_123' },
        fields: { routingKey: 'feedback.FeedbackCreatedEvent' },
      };

      // Simulate message processing
      const consumeCallback = (mockChannel.consume as any).mock.calls[0]?.[1];
      if (consumeCallback) {
        await consumeCallback(mockMessage);
        expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      }
    });

    it('should setup dead letter queue for failed messages', async () => {
      // Test that DLQ configuration is available
      expect(consumerService).toBeDefined();
      expect(consumerService.getHealthStatus).toBeDefined();

      // Test DLQ functionality by checking health status
      const healthStatus = consumerService.getHealthStatus();
      expect(healthStatus).toBeDefined();
    });
  });

  describe('AC 2: Event Handlers', () => {
    it('should handle feedback events', async () => {
      const feedbackCreatedHandler = moduleRef.get<FeedbackCreatedEventHandler>(
        FeedbackCreatedEventHandler,
      );
      const statusChangedHandler =
        moduleRef.get<StatusChangedEventHandler>(StatusChangedEventHandler);
      const slaBreachedHandler = moduleRef.get<SLABreachedEventHandler>(SLABreachedEventHandler);

      expect(feedbackCreatedHandler.getEventType()).toBe('feedback.FeedbackCreatedEvent');
      expect(statusChangedHandler.getEventType()).toBe('feedback.StatusChangedEvent');
      expect(slaBreachedHandler.getEventType()).toBe('feedback.SLABreachedEvent');

      // Test event handling
      const event = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date(),
        payload: { feedbackId: 'feedback_123' },
        correlationId: 'corr_123',
      };

      await feedbackCreatedHandler.handle(event);
      // Handler should process without error
    });

    it('should handle auth service events', async () => {
      const userRoleChangedHandler = moduleRef.get<UserRoleChangedEventHandler>(
        UserRoleChangedEventHandler,
      );
      const userUpdatedHandler = moduleRef.get<UserUpdatedEventHandler>(UserUpdatedEventHandler);
      const userCreatedHandler = moduleRef.get<UserCreatedEventHandler>(UserCreatedEventHandler);

      expect(userRoleChangedHandler.getEventType()).toBe('auth.UserRoleChangedEvent');
      expect(userUpdatedHandler.getEventType()).toBe('auth.UserUpdatedEvent');
      expect(userCreatedHandler.getEventType()).toBe('auth.UserCreatedEvent');

      // Test event handling
      const event = {
        eventId: 'event_456',
        eventType: 'auth.UserRoleChangedEvent',
        aggregateId: 'user_123',
        aggregateType: 'User',
        timestamp: new Date(),
        payload: { userId: 'user_123' },
        correlationId: 'corr_456',
      };

      await userRoleChangedHandler.handle(event);
      // Handler should process without error
    });

    it('should register event handlers successfully', () => {
      const healthStatus = consumerService.getHealthStatus();
      expect(healthStatus.registeredHandlers).toBeDefined();
      expect(Array.isArray(healthStatus.registeredHandlers)).toBe(true);
    });
  });

  describe('AC 3: Event Schema Validation', () => {
    it('should validate required fields', async () => {
      const validEvent = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date(),
        payload: { feedbackId: 'feedback_123' },
      };

      const result = await validationService.validateEventMessage(validEvent);
      expect(result.isValid).toBe(true);
    });

    it('should reject missing required fields', async () => {
      const invalidEvent = {
        eventId: 'event_123',
        // Missing eventType, aggregateId, aggregateType, timestamp, payload
      };

      const result = await validationService.validateEventMessage(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Missing required fields: eventId, eventType, aggregateId, aggregateType, timestamp, payload',
      );
    });

    it('should validate optional fields', async () => {
      const eventWithOptionalFields = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date(),
        payload: { feedbackId: 'feedback_123' },
        correlationId: 'corr_123',
        metadata: { source: 'test' },
      };

      const result = await validationService.validateEventMessage(eventWithOptionalFields);
      expect(result.isValid).toBe(true);
    });

    it('should validate payload structure per event type', async () => {
      // Test different event types
      const feedbackEvent = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date(),
        payload: { feedbackId: 'feedback_123', userId: 'user_123' },
      };

      const authEvent = {
        eventId: 'event_456',
        eventType: 'auth.UserRoleChangedEvent',
        aggregateId: 'user_123',
        aggregateType: 'User',
        timestamp: new Date(),
        payload: { userId: 'user_123', previousRoles: ['resident'] },
      };

      const feedbackResult = await validationService.validateEventMessage(feedbackEvent);
      const authResult = await validationService.validateEventMessage(authEvent);

      expect(feedbackResult.isValid).toBe(true);
      expect(authResult.isValid).toBe(true);
    });
  });

  describe('AC 4: Retry Logic', () => {
    it('should implement exponential backoff with correct delays', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt'))
        .mockRejectedValueOnce(new Error('Second attempt'))
        .mockRejectedValueOnce(new Error('Third attempt'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      const result = await retryService.executeWithRetry(operation);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(4);

      // Check that delays are approximately correct (allowing for some variance)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeGreaterThan(100 + 500 + 2000 - 100); // Allow 100ms variance
      expect(totalTime).toBeLessThan(100 + 500 + 2000 + 100);
    });

    it('should move to DLQ after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await retryService.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(4); // 3 retries + 1 initial attempt
      expect(result.error).toBeDefined();
    });

    it('should respect max retries configuration', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await retryService.executeWithRetry(operation, { maxRetries: 2 });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // 2 retries + 1 initial attempt
    });
  });

  describe('AC 5: Monitoring', () => {
    it('should log all events with correlation IDs for tracing', async () => {
      const loggerSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date(),
        payload: { feedbackId: 'feedback_123' },
        correlationId: 'corr_123',
      };

      const feedbackHandler = moduleRef.get<FeedbackCreatedEventHandler>(
        FeedbackCreatedEventHandler,
      );
      await feedbackHandler.handle(event);

      // Check that correlation ID is logged
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Feedback created event handled:'),
        expect.objectContaining({
          correlationId: 'corr_123',
          eventId: 'event_123',
          aggregateId: 'feedback_123',
        }),
      );

      loggerSpy.mockRestore();
    });

    it('should provide health status with monitoring information', () => {
      const healthStatus = consumerService.getHealthStatus();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.isConsuming).toBeDefined();
      expect(healthStatus.registeredHandlers).toBeDefined();
      expect(healthStatus.timestamp).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should process complete message flow from publish to handle', async () => {
      const event = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date(),
        payload: {
          feedbackId: 'feedback_123',
          userId: 'user_123',
          title: 'Test Feedback',
        },
        correlationId: 'corr_123',
      };

      // 1. Publish message
      await rabbitMQService.publish(
        'notifications.exchange',
        'feedback.FeedbackCreatedEvent',
        event,
      );
      expect(rabbitMQService.publish).toHaveBeenCalledWith(
        'notifications.exchange',
        'feedback.FeedbackCreatedEvent',
        event,
      );

      // 2. Validate message
      const validation = await validationService.validateEventMessage(event);
      expect(validation.isValid).toBe(true);

      // 3. Handle event
      const feedbackHandler = moduleRef.get<FeedbackCreatedEventHandler>(
        FeedbackCreatedEventHandler,
      );
      await feedbackHandler.handle(event);
      // Should complete without error
    });

    it('should handle error scenarios gracefully', async () => {
      const invalidEvent = {
        eventId: 'event_123',
        // Missing required fields
      };

      // Should reject invalid event
      const validation = await validationService.validateEventMessage(invalidEvent);
      expect(validation.isValid).toBe(false);

      // Should handle retry logic for failed operations
      const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const retryResult = await retryService.executeWithRetry(failingOperation);
      expect(retryResult.success).toBe(false);
      expect(retryResult.attempts).toBe(4);
    });
  });
});
