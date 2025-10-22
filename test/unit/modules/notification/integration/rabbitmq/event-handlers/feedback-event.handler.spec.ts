import { Test, TestingModule } from '@nestjs/testing';
import { BaseEventDto } from 'src/modules/notification/integration/rabbitmq/event-handlers/base-event.handler';
import {
  FeedbackCreatedEventHandler,
  FeedbackSubmittedEventHandler,
  StatusChangedEventHandler,
  FeedbackAssignedEventHandler,
  AssignmentCreatedEventHandler,
  CommentAddedEventHandler,
  SLABreachedEventHandler,
  SLAWarningEventHandler,
  FeedbackResolvedEventHandler,
  FeedbackClosedEventHandler,
} from 'src/modules/notification/integration/rabbitmq/event-handlers/feedback-event.handler';
import { FeedbackStatus, FeedbackPriority } from 'src/common/dto/event-schemas/feedback-events.dto';

describe('Feedback Event Handlers', () => {
  let module: TestingModule;
  let feedbackCreatedHandler: FeedbackCreatedEventHandler;
  let feedbackSubmittedHandler: FeedbackSubmittedEventHandler;
  let statusChangedHandler: StatusChangedEventHandler;
  let feedbackAssignedHandler: FeedbackAssignedEventHandler;
  let assignmentCreatedHandler: AssignmentCreatedEventHandler;
  let commentAddedHandler: CommentAddedEventHandler;
  let slaBreachedHandler: SLABreachedEventHandler;
  let slaWarningHandler: SLAWarningEventHandler;
  let feedbackResolvedHandler: FeedbackResolvedEventHandler;
  let feedbackClosedHandler: FeedbackClosedEventHandler;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        FeedbackCreatedEventHandler,
        FeedbackSubmittedEventHandler,
        StatusChangedEventHandler,
        FeedbackAssignedEventHandler,
        AssignmentCreatedEventHandler,
        CommentAddedEventHandler,
        SLABreachedEventHandler,
        SLAWarningEventHandler,
        FeedbackResolvedEventHandler,
        FeedbackClosedEventHandler,
      ],
    }).compile();

    feedbackCreatedHandler = module.get<FeedbackCreatedEventHandler>(FeedbackCreatedEventHandler);
    feedbackSubmittedHandler = module.get<FeedbackSubmittedEventHandler>(
      FeedbackSubmittedEventHandler,
    );
    statusChangedHandler = module.get<StatusChangedEventHandler>(StatusChangedEventHandler);
    feedbackAssignedHandler = module.get<FeedbackAssignedEventHandler>(
      FeedbackAssignedEventHandler,
    );
    assignmentCreatedHandler = module.get<AssignmentCreatedEventHandler>(
      AssignmentCreatedEventHandler,
    );
    commentAddedHandler = module.get<CommentAddedEventHandler>(CommentAddedEventHandler);
    slaBreachedHandler = module.get<SLABreachedEventHandler>(SLABreachedEventHandler);
    slaWarningHandler = module.get<SLAWarningEventHandler>(SLAWarningEventHandler);
    feedbackResolvedHandler = module.get<FeedbackResolvedEventHandler>(
      FeedbackResolvedEventHandler,
    );
    feedbackClosedHandler = module.get<FeedbackClosedEventHandler>(FeedbackClosedEventHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FeedbackCreatedEventHandler', () => {
    it('should return correct event type', () => {
      expect(feedbackCreatedHandler.getEventType()).toBe('feedback.FeedbackCreatedEvent');
    });

    it('should handle feedback created event successfully', async () => {
      const loggerSpy = jest.spyOn(feedbackCreatedHandler['logger'], 'log').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: {
          feedbackId: 'feedback_123',
          title: 'Test Feedback',
          description: 'Test Description',
          userId: 'user_123',
          categoryId: 'category_123',
          priority: FeedbackPriority.HIGH,
        },
        correlationId: 'corr_123',
      };

      await feedbackCreatedHandler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Processing feedback.FeedbackCreatedEvent event',
        expect.objectContaining({
          eventId: 'event_123',
          aggregateId: 'feedback_123',
          correlationId: 'corr_123',
          action: 'feedback created',
        }),
      );

      expect(loggerSpy).toHaveBeenCalledWith('Processing feedback.FeedbackCreatedEvent event', {
        eventId: 'event_123',
        aggregateId: 'feedback_123',
        correlationId: 'corr_123',
        action: 'feedback created',
      });

      loggerSpy.mockRestore();
    });

    it('should handle errors and rethrow them', async () => {
      const loggerSpy = jest.spyOn(feedbackCreatedHandler['logger'], 'error').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'feedback.FeedbackCreatedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: {
          feedbackId: 'feedback_123',
          title: 'Test Feedback',
          description: 'Test Description',
          userId: 'user_123',
        },
        correlationId: 'corr_123',
      };

      // Test logEventError method directly
      const error = new Error('Test error');
      feedbackCreatedHandler['logEventError'](event, error, 'feedback created');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error processing feedback.FeedbackCreatedEvent event',
        expect.objectContaining({
          eventId: 'event_123',
          aggregateId: 'feedback_123',
          correlationId: 'corr_123',
          action: 'feedback created',
          error: 'Test error',
        }),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('StatusChangedEventHandler', () => {
    it('should return correct event type', () => {
      expect(statusChangedHandler.getEventType()).toBe('feedback.StatusChangedEvent');
    });

    it('should handle status changed event successfully', async () => {
      const loggerSpy = jest.spyOn(statusChangedHandler['logger'], 'log').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'feedback.StatusChangedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: {
          feedbackId: 'feedback_123',
          previousStatus: FeedbackStatus.PENDING,
          newStatus: FeedbackStatus.IN_PROGRESS,
          changedBy: 'user_456',
          reason: 'Started working on feedback',
        },
        correlationId: 'corr_123',
      };

      await statusChangedHandler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith('Processing feedback.StatusChangedEvent event', {
        eventId: 'event_123',
        aggregateId: 'feedback_123',
        correlationId: 'corr_123',
        action: 'status changed',
      });

      loggerSpy.mockRestore();
    });
  });

  describe('SLABreachedEventHandler', () => {
    it('should return correct event type', () => {
      expect(slaBreachedHandler.getEventType()).toBe('feedback.SLABreachedEvent');
    });

    it('should handle SLA breached event successfully', async () => {
      const loggerSpy = jest.spyOn(slaBreachedHandler['logger'], 'log').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'feedback.SLABreachedEvent',
        aggregateId: 'feedback_123',
        aggregateType: 'Feedback',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: {
          feedbackId: 'feedback_123',
          slaType: 'response_time',
          breachedAt: '2025-01-16T10:00:00Z',
          assignedTo: 'user_789',
        },
        correlationId: 'corr_123',
      };

      await slaBreachedHandler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith('Processing feedback.SLABreachedEvent event', {
        eventId: 'event_123',
        aggregateId: 'feedback_123',
        correlationId: 'corr_123',
        action: 'SLA breached',
      });

      loggerSpy.mockRestore();
    });
  });

  // Add more tests for other handlers as needed...
});
