import { Test, TestingModule } from '@nestjs/testing';
import { GetNotificationHistoryHandler } from './get-notification-history.handler';
import { NotificationCacheService } from '../../../../../infrastructure/cache/notification-cache.service';
import { GetNotificationHistoryQuery } from './get-notification-history.query';
import { NotificationRepositoryImpl } from '../../infrastructure/notification.repository.impl';
import { MockDataHelper } from '../../../../../../test/helpers/mock-data.helper';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../../../../common/types/notification.types';
import { NotificationStatus } from '../../../../../common/enums/notification-status.enum';

describe('GetNotificationHistoryHandler', () => {
  let handler: GetNotificationHistoryHandler;
  let mockRepository: jest.Mocked<NotificationRepositoryImpl>;
  let mockCacheService: jest.Mocked<NotificationCacheService>;

  const mockUserNotifications = MockDataHelper.createMockUserNotifications(2, [
    {
      id: 'notif-1',
      userId: 'user-1',
      notificationId: 'notification-1',
      title: 'Test Notification 1',
      body: 'Test body 1',
      type: NotificationType.PAYMENT,
      channel: NotificationChannel.PUSH,
      priority: NotificationPriority.HIGH,
      status: NotificationStatus.DELIVERED,
      data: { amount: 100 },
      sentAt: new Date('2024-01-01T10:00:00Z'),
      deliveredAt: new Date('2024-01-01T10:01:00Z'),
      readAt: undefined,
      createdAt: new Date('2024-01-01T09:00:00Z'),
      updatedAt: new Date('2024-01-01T10:01:00Z'),
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      notificationId: 'notification-2',
      title: 'Test Notification 2',
      body: 'Test body 2',
      type: NotificationType.BOOKING,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.NORMAL,
      status: NotificationStatus.READ,
      data: { bookingId: 'booking-123' },
      sentAt: new Date('2024-01-02T10:00:00Z'),
      deliveredAt: new Date('2024-01-02T10:01:00Z'),
      readAt: new Date('2024-01-02T11:00:00Z'),
      createdAt: new Date('2024-01-02T09:00:00Z'),
      updatedAt: new Date('2024-01-02T11:00:00Z'),
    },
  ]);

  beforeEach(async () => {
    const mockRepositoryValue = {
      getUserNotifications: jest.fn(),
    };

    const mockCacheServiceValue = {
      getCachedNotificationHistory: jest.fn(),
      cacheNotificationHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetNotificationHistoryHandler,
        {
          provide: 'NotificationRepository',
          useValue: mockRepositoryValue,
        },
        {
          provide: NotificationCacheService,
          useValue: mockCacheServiceValue,
        },
      ],
    }).compile();

    handler = module.get<GetNotificationHistoryHandler>(GetNotificationHistoryHandler);
    mockRepository = module.get('NotificationRepository');
    mockCacheService = module.get(NotificationCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const baseQuery: GetNotificationHistoryQuery = {
      userId: 'user-1',
      page: 1,
      limit: 20,
    };

    it('should return cached data when available', async () => {
      // Arrange
      const cachedData = {
        notifications: mockUserNotifications,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        cachedAt: new Date(),
      };

      mockCacheService.getCachedNotificationHistory.mockResolvedValue(cachedData);

      // Act
      const result = await handler.execute(baseQuery);

      // Assert
      expect(result).toEqual({
        notifications: mockUserNotifications,
        pagination: cachedData.pagination,
      });
      expect(mockCacheService.getCachedNotificationHistory).toHaveBeenCalledWith('user-1', 1, 20, {
        type: undefined,
        channel: undefined,
        status: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
      expect(mockRepository.getUserNotifications).not.toHaveBeenCalled();
    });

    it('should fetch from repository when cache miss', async () => {
      // Arrange
      mockCacheService.getCachedNotificationHistory.mockResolvedValue(null);
      mockRepository.getUserNotifications.mockResolvedValue(mockUserNotifications);

      // Act
      const result = await handler.execute(baseQuery);

      // Assert
      expect(mockRepository.getUserNotifications).toHaveBeenCalledWith('user-1', {
        status: undefined,
        channel: undefined,
        type: undefined,
        limit: 20,
        offset: 0,
        startDate: undefined,
        endDate: undefined,
      });

      expect(result.notifications).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      expect(mockCacheService.cacheNotificationHistory).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const queryWithFilters: GetNotificationHistoryQuery = {
        ...baseQuery,
        type: 'payment',
        channel: 'push',
        status: 'delivered',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      mockCacheService.getCachedNotificationHistory.mockResolvedValue(null);
      mockRepository.getUserNotifications.mockResolvedValue([mockUserNotifications[0]]);

      // Act
      await handler.execute(queryWithFilters);

      // Assert
      expect(mockRepository.getUserNotifications).toHaveBeenCalledWith('user-1', {
        status: 'delivered',
        channel: 'push',
        type: 'payment',
        limit: 20,
        offset: 0,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const queryWithPagination: GetNotificationHistoryQuery = {
        ...baseQuery,
        page: 2,
        limit: 10,
      };

      mockCacheService.getCachedNotificationHistory.mockResolvedValue(null);
      mockRepository.getUserNotifications.mockResolvedValue(mockUserNotifications);

      // Act
      const result = await handler.execute(queryWithPagination);

      // Assert
      expect(mockRepository.getUserNotifications).toHaveBeenCalledWith('user-1', {
        status: undefined,
        channel: undefined,
        type: undefined,
        limit: 10,
        offset: 10, // (page - 1) * limit
        startDate: undefined,
        endDate: undefined,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });

    it('should enforce maximum limit of 100', async () => {
      // Arrange
      const queryWithHighLimit: GetNotificationHistoryQuery = {
        ...baseQuery,
        limit: 200,
      };

      mockCacheService.getCachedNotificationHistory.mockResolvedValue(null);
      mockRepository.getUserNotifications.mockResolvedValue(mockUserNotifications);

      // Act
      await handler.execute(queryWithHighLimit);

      // Assert
      expect(mockRepository.getUserNotifications).toHaveBeenCalledWith('user-1', {
        status: undefined,
        channel: undefined,
        type: undefined,
        limit: 100, // Should be capped at 100
        offset: 0,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockCacheService.getCachedNotificationHistory.mockResolvedValue(null);
      mockRepository.getUserNotifications.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(handler.execute(baseQuery)).rejects.toThrow('Database error');
    });

    it('should handle cache errors gracefully', async () => {
      // Arrange
      mockCacheService.getCachedNotificationHistory.mockRejectedValue(new Error('Cache error'));
      mockRepository.getUserNotifications.mockResolvedValue(mockUserNotifications);

      // Act & Assert
      await expect(handler.execute(baseQuery)).rejects.toThrow('Cache error');
    });
  });
});
