import { Test, TestingModule } from '@nestjs/testing';
import { EventValidationService } from 'src/infrastructure/messaging/event-validation.service';
import { BaseEventDto } from 'src/common/dto/event-schemas/base-event.dto';

describe('EventValidationService', () => {
  let service: EventValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventValidationService],
    }).compile();

    service = module.get<EventValidationService>(EventValidationService);
  });

  describe('validateEventMessage', () => {
    it('should validate valid event message successfully', async () => {
      const validMessage = {
        event: {
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
          },
          correlationId: 'corr_123',
        },
        routingKey: 'feedback.FeedbackCreatedEvent',
        receivedAt: '2025-01-16T10:00:00Z',
      };

      const result = await service.validateEventMessage(validMessage);

      expect(result.isValid).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event?.eventId).toBe('event_123');
      expect(result.event?.eventType).toBe('feedback.FeedbackCreatedEvent');
    });

    it('should reject invalid event message with missing required fields', async () => {
      const invalidMessage = {
        event: {
          eventId: 'event_123',
          // Missing eventType, aggregateId, aggregateType, timestamp, payload
        },
      };

      const result = await service.validateEventMessage(invalidMessage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      // Note: class-validator might not return errors for missing fields in some cases
      // This test verifies the validation structure works
    });

    it('should reject event message with invalid payload structure', async () => {
      const invalidMessage = {
        event: {
          eventId: 'event_123',
          eventType: 'feedback.FeedbackCreatedEvent',
          aggregateId: 'feedback_123',
          aggregateType: 'Feedback',
          timestamp: '2025-01-16T10:00:00Z',
          payload: {
            // Missing required fields: feedbackId, title, description, userId
            invalidField: 'invalid',
          },
        },
      };

      const result = await service.validateEventMessage(invalidMessage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle unknown event types gracefully', async () => {
      const unknownEventMessage = {
        event: {
          eventId: 'event_123',
          eventType: 'unknown.UnknownEvent',
          aggregateId: 'aggregate_123',
          aggregateType: 'Unknown',
          timestamp: '2025-01-16T10:00:00Z',
          payload: {
            anyField: 'anyValue',
          },
        },
      };

      const result = await service.validateEventMessage(unknownEventMessage);

      expect(result.isValid).toBe(true);
      expect(result.event).toBeDefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedMessage = {
        event: 'invalid json string',
      };

      const result = await service.validateEventMessage(malformedMessage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      // The actual error message might vary based on class-validator behavior
      expect(result.errors?.[0]).toBeDefined();
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = service.generateCorrelationId();
      const id2 = service.generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^corr_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^corr_\d+_[a-z0-9]+$/);
    });

    it('should generate correlation IDs with correct format', () => {
      const correlationId = service.generateCorrelationId();

      expect(correlationId).toMatch(/^corr_\d+_[a-z0-9]{9}$/);
    });
  });

  describe('validateEventPayload', () => {
    it('should validate feedback created event payload', async () => {
      const validPayload = {
        feedbackId: 'feedback_123',
        title: 'Test Feedback',
        description: 'Test Description',
        userId: 'user_123',
        categoryId: 'category_123',
        priority: 'high',
      };

      const result = await service['validateEventPayload'](
        'feedback.FeedbackCreatedEvent',
        validPayload,
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid feedback created event payload', async () => {
      const invalidPayload = {
        // Missing required fields: feedbackId, title, description, userId
        categoryId: 'category_123',
      };

      const result = await service['validateEventPayload'](
        'feedback.FeedbackCreatedEvent',
        invalidPayload,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should validate auth user created event payload', async () => {
      const validPayload = {
        userId: 'user_123',
        email: 'test@example.com',
        roles: ['resident'],
        createdBy: 'user_456',
      };

      const result = await service['validateEventPayload']('auth.UserCreatedEvent', validPayload);

      expect(result.isValid).toBe(true);
    });

    it('should handle unknown event types', async () => {
      const payload = { anyField: 'anyValue' };

      const result = await service['validateEventPayload']('unknown.UnknownEvent', payload);

      expect(result.isValid).toBe(true);
    });
  });
});
