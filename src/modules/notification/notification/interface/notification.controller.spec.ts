import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { NotificationHistoryQueryDto } from './dto/notification-history.dto';
import { MockDataHelper } from '../../../../../test/helpers/mock-data.helper';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../../../common/types/notification.types';
import { NotificationStatus } from '../../../../common/enums/notification-status.enum';

describe('NotificationController', () => {
  let controller: NotificationController;
  let mockCommandBus: jest.Mocked<CommandBus>;
  let mockQueryBus: jest.Mocked<QueryBus>;

  const mockUserId = 'user-1';

  beforeEach(async () => {
    const mockCommandBusValue = {
      execute: jest.fn(),
    };

    const mockQueryBusValue = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBusValue,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBusValue,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    mockCommandBus = module.get(CommandBus);
    mockQueryBus = module.get(QueryBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotificationHistory', () => {
    it('should get notification history successfully', async () => {
      // Arrange
      const query: NotificationHistoryQueryDto = {
        page: 1,
        limit: 20,
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.DELIVERED,
      };

      const mockResult = {
        notifications: MockDataHelper.createMockUserNotifications(1, [
          {
            id: 'notif-1',
            title: 'Test Notification',
            body: 'Test body',
            type: NotificationType.PAYMENT,
            channel: NotificationChannel.PUSH,
            priority: NotificationPriority.HIGH,
            status: NotificationStatus.DELIVERED,
            createdAt: new Date('2024-01-01T10:00:00Z'),
            readAt: undefined,
          },
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockQueryBus.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getNotificationHistory(query, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('Notification history retrieved successfully');
      expect(result.timestamp).toBeDefined();

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
        }),
      );
    });

    it('should get notification history with date range filter', async () => {
      // Arrange
      const query: NotificationHistoryQueryDto = {
        page: 1,
        limit: 20,
        type: 'payment',
        channel: 'push',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      };

      const mockResult = {
        notifications: MockDataHelper.createMockUserNotifications(1, [
          {
            id: 'notif-1',
            title: 'Test Notification',
            body: 'Test body',
            type: NotificationType.PAYMENT,
            channel: NotificationChannel.PUSH,
            priority: NotificationPriority.HIGH,
            status: NotificationStatus.DELIVERED,
            createdAt: new Date('2024-01-01T10:00:00Z'),
            readAt: undefined,
          },
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockQueryBus.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getNotificationHistory(query, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('Notification history retrieved successfully');
      expect(result.timestamp).toBeDefined();

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
        }),
      );
    });
  });

  describe('getNotificationDetail', () => {
    it('should get notification detail successfully', async () => {
      // Arrange
      const notificationId = 'notif-1';
      const mockResult = MockDataHelper.createMockUserNotification({
        id: notificationId,
        title: 'Test Notification',
        body: 'Test body',
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.PUSH,
        priority: NotificationPriority.HIGH,
        status: NotificationStatus.DELIVERED,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        readAt: new Date('2024-01-01T10:01:00Z'),
        updatedAt: new Date('2024-01-01T10:01:00Z'),
      });

      mockQueryBus.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getNotificationDetail(notificationId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('Notification detail retrieved successfully');
      expect(result.timestamp).toBeDefined();

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationId,
          userId: mockUserId,
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      // Arrange
      const notificationId = 'notif-1';
      const mockResult = {
        success: true,
        notificationId,
        readAt: new Date('2024-01-01T10:01:00Z'),
      };

      mockCommandBus.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.markAsRead(notificationId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('Notification marked as read successfully');
      expect(result.timestamp).toBeDefined();

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationId,
          userId: mockUserId,
        }),
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      // Arrange
      const mockResult = {
        success: true,
        updatedCount: 3,
        readAt: new Date('2024-01-01T10:01:00Z'),
      };

      mockCommandBus.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.markAllAsRead(mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('3 notifications marked as read successfully');
      expect(result.timestamp).toBeDefined();

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      // Arrange
      const mockResult = {
        count: 5,
        lastUpdated: new Date('2024-01-01T10:00:00Z'),
      };

      mockQueryBus.execute.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getUnreadCount(mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.message).toBe('Unread count retrieved successfully');
      expect(result.timestamp).toBeDefined();

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
        }),
      );
    });
  });
});
