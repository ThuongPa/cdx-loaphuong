import { Test, TestingModule } from '@nestjs/testing';
import { BaseEventDto } from 'src/modules/notification/integration/rabbitmq/event-handlers/base-event.handler';
import {
  UserRoleChangedEventHandler,
  UserUpdatedEventHandler,
  UserCreatedEventHandler,
} from 'src/modules/notification/integration/rabbitmq/event-handlers/auth-event.handler';

describe('Auth Event Handlers', () => {
  let module: TestingModule;
  let userRoleChangedHandler: UserRoleChangedEventHandler;
  let userUpdatedHandler: UserUpdatedEventHandler;
  let userCreatedHandler: UserCreatedEventHandler;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [UserRoleChangedEventHandler, UserUpdatedEventHandler, UserCreatedEventHandler],
    }).compile();

    userRoleChangedHandler = module.get<UserRoleChangedEventHandler>(UserRoleChangedEventHandler);
    userUpdatedHandler = module.get<UserUpdatedEventHandler>(UserUpdatedEventHandler);
    userCreatedHandler = module.get<UserCreatedEventHandler>(UserCreatedEventHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UserRoleChangedEventHandler', () => {
    it('should return correct event type', () => {
      expect(userRoleChangedHandler.getEventType()).toBe('auth.UserRoleChangedEvent');
    });

    it('should handle user role changed event successfully', async () => {
      const loggerSpy = jest.spyOn(userRoleChangedHandler['logger'], 'log').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'auth.UserRoleChangedEvent',
        aggregateId: 'user_123',
        aggregateType: 'User',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: {
          userId: 'user_123',
          previousRoles: ['resident'],
          newRoles: ['resident', 'admin'],
          changedBy: 'user_456',
          reason: 'Promoted to admin',
        },
        correlationId: 'corr_123',
      };

      await userRoleChangedHandler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Processing auth.UserRoleChangedEvent event',
        expect.objectContaining({
          eventId: 'event_123',
          aggregateId: 'user_123',
          correlationId: 'corr_123',
          action: 'user role changed',
        }),
      );

      expect(loggerSpy).toHaveBeenCalledWith('Processing auth.UserRoleChangedEvent event', {
        eventId: 'event_123',
        aggregateId: 'user_123',
        correlationId: 'corr_123',
        action: 'user role changed',
      });

      loggerSpy.mockRestore();
    });

    it('should handle errors and rethrow them', async () => {
      const loggerSpy = jest.spyOn(userRoleChangedHandler['logger'], 'error').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'auth.UserRoleChangedEvent',
        aggregateId: 'user_123',
        aggregateType: 'User',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: {
          userId: 'user_123',
          previousRoles: ['resident'],
          newRoles: ['admin'],
          changedBy: 'user_456',
        },
        correlationId: 'corr_123',
      };

      // Test logEventError method directly
      const error = new Error('Test error');
      userRoleChangedHandler['logEventError'](event, error, 'user role changed');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error processing auth.UserRoleChangedEvent event',
        expect.objectContaining({
          eventId: 'event_123',
          aggregateId: 'user_123',
          correlationId: 'corr_123',
          action: 'user role changed',
          error: 'Test error',
        }),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('UserUpdatedEventHandler', () => {
    it('should return correct event type', () => {
      expect(userUpdatedHandler.getEventType()).toBe('auth.UserUpdatedEvent');
    });

    it('should handle user updated event successfully', async () => {
      const loggerSpy = jest.spyOn(userUpdatedHandler['logger'], 'log').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'auth.UserUpdatedEvent',
        aggregateId: 'user_123',
        aggregateType: 'User',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: {
          userId: 'user_123',
          email: 'newemail@example.com',
          phone: '+1234567890',
          firstName: 'John',
          lastName: 'Doe',
          isActive: true,
          updatedBy: 'user_456',
        },
        correlationId: 'corr_123',
      };

      await userUpdatedHandler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith('Processing auth.UserUpdatedEvent event', {
        eventId: 'event_123',
        aggregateId: 'user_123',
        correlationId: 'corr_123',
        action: 'user updated',
      });

      loggerSpy.mockRestore();
    });
  });

  describe('UserCreatedEventHandler', () => {
    it('should return correct event type', () => {
      expect(userCreatedHandler.getEventType()).toBe('auth.UserCreatedEvent');
    });

    it('should handle user created event successfully', async () => {
      const loggerSpy = jest.spyOn(userCreatedHandler['logger'], 'log').mockImplementation();

      const event: BaseEventDto = {
        eventId: 'event_123',
        eventType: 'auth.UserCreatedEvent',
        aggregateId: 'user_123',
        aggregateType: 'User',
        timestamp: new Date('2025-01-16T10:00:00Z'),
        payload: {
          userId: 'user_123',
          email: 'newuser@example.com',
          phone: '+1234567890',
          firstName: 'Jane',
          lastName: 'Smith',
          roles: ['resident'],
          createdBy: 'user_456',
        },
        correlationId: 'corr_123',
      };

      await userCreatedHandler.handle(event);

      expect(loggerSpy).toHaveBeenCalledWith('Processing auth.UserCreatedEvent event', {
        eventId: 'event_123',
        aggregateId: 'user_123',
        correlationId: 'corr_123',
        action: 'user created',
      });

      loggerSpy.mockRestore();
    });
  });
});
