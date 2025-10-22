import { Test, TestingModule } from '@nestjs/testing';
import { BaseEventHandler } from 'src/modules/notification/integration/rabbitmq/event-handlers/base-event.handler';
import { BaseEventDto } from 'src/modules/notification/integration/rabbitmq/event-handlers/base-event.handler';

class TestEventHandler extends BaseEventHandler {
  getEventType(): string {
    return 'test.TestEvent';
  }

  async handle(event: BaseEventDto): Promise<void> {
    // Test implementation
  }
}

describe('BaseEventHandler', () => {
  let handler: TestEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestEventHandler],
    }).compile();

    handler = module.get<TestEventHandler>(TestEventHandler);
  });

  describe('logEventProcessing', () => {
    it('should log event processing with correct information', () => {
      const loggerSpy = jest.spyOn(handler['logger'], 'log').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'test.TestEvent',
        aggregateId: 'aggregate_123',
        aggregateType: 'TestAggregate',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: { test: 'data' },
        correlationId: 'corr_123',
      };

      handler['logEventProcessing'](event, 'test action');

      expect(loggerSpy).toHaveBeenCalledWith('Processing test.TestEvent event', {
        eventId: 'event_123',
        aggregateId: 'aggregate_123',
        correlationId: 'corr_123',
        action: 'test action',
      });

      loggerSpy.mockRestore();
    });
  });

  describe('logEventError', () => {
    it('should log event error with correct information', () => {
      const loggerSpy = jest.spyOn(handler['logger'], 'error').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'test.TestEvent',
        aggregateId: 'aggregate_123',
        aggregateType: 'TestAggregate',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: { test: 'data' },
        correlationId: 'corr_123',
      };

      const error = new Error('Test error');

      handler['logEventError'](event, error, 'test action');

      expect(loggerSpy).toHaveBeenCalledWith('Error processing test.TestEvent event', {
        eventId: 'event_123',
        aggregateId: 'aggregate_123',
        correlationId: 'corr_123',
        action: 'test action',
        error: 'Test error',
      });

      loggerSpy.mockRestore();
    });
  });
});
