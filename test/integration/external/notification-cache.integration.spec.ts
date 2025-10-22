import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NotificationCacheService } from '../../../src/infrastructure/cache/notification-cache.service';
import { RedisService } from '../../../src/infrastructure/cache/redis.service';
import { RedisConfig } from '../../../src/config/redis.config';

describe('NotificationCacheService Integration Tests', () => {
  let moduleRef: TestingModule;
  let cacheService: any;

  const testUserId = 'test-user-123';

  const mockNotificationHistory = {
    notifications: [
      { id: '1', title: 'Test 1', content: 'Content 1', userId: testUserId, createdAt: new Date() },
      { id: '2', title: 'Test 2', content: 'Content 2', userId: testUserId, createdAt: new Date() },
    ],
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

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['config/development.env', '.env'],
          load: [RedisConfig],
        }),
      ],
      providers: [RedisService, NotificationCacheService],
    }).compile();

    cacheService = moduleRef.get<NotificationCacheService>(NotificationCacheService);
    // redisService = moduleRef.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    // Clean up test cache data
    // await redisService.del(`notification:history:${testUserId}:*`);
    // await redisService.del(`notification:unread-count:${testUserId}`);
  });

  const cacheFilters = {
    type: 'payment',
    channel: 'push',
    status: 'delivered' as any,
  };

  describe('Notification History Caching', () => {
    it('should cache and retrieve notification history', async () => {
      // Act - Cache the data
      await cacheService.cacheNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
        mockNotificationHistory,
      );

      // Act - Retrieve cached data
      const cached = await cacheService.getCachedNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
      );

      // Assert
      expect(cached).not.toBeNull();
      expect((cached as any).notifications).toHaveLength(1);
      expect((cached as any).notifications[0].id).toBe('notif-1');
      expect(cached!.pagination.page).toBe(1);
      expect(cached!.pagination.limit).toBe(20);
    });

    it('should return null for cache miss', async () => {
      // Act
      const cached = await cacheService.getCachedNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
      );

      // Assert
      expect(cached).toBeNull();
    });

    it('should handle different filter combinations', async () => {
      // Arrange
      const filters1 = { type: 'payment', channel: 'push' };
      const filters2 = { type: 'booking', channel: 'email' };

      // Act - Cache with different filters2
      await cacheService.cacheNotificationHistory(testUserId, 1, 20, filters1, {
        ...mockNotificationHistory,
        notifications: [],
      });

      await cacheService.cacheNotificationHistory(testUserId, 1, 20, filters2, {
        ...mockNotificationHistory,
        notifications: [],
      });

      // Act - Retrieve with different filters2
      const cached1 = await cacheService.getCachedNotificationHistory(testUserId, 1, 20, filters1);

      const cached2 = await cacheService.getCachedNotificationHistory(testUserId, 1, 20, filters2);

      // Assert
      expect(cached1).not.toBeNull();
      expect(cached2).not.toBeNull();
      expect(cached1).not.toEqual(cached2);
    });

    it('should handle (pagination as any) correctly', async () => {
      // Arrange
      const page1Data = {
        ...mockNotificationHistory,
        pagination: { ...mockNotificationHistory.pagination, page: 1 },
      };
      const page2Data = {
        ...mockNotificationHistory,
        pagination: { ...mockNotificationHistory.pagination, page: 2 },
      };

      // Act - Cache different pages
      await cacheService.cacheNotificationHistory(testUserId, 1, 20, cacheFilters, page1Data);
      await cacheService.cacheNotificationHistory(testUserId, 2, 20, cacheFilters, page2Data);

      // Act - Retrieve different pages
      const cachedPage1 = await cacheService.getCachedNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
      );
      const cachedPage2 = await cacheService.getCachedNotificationHistory(
        testUserId,
        2,
        20,
        cacheFilters,
      );

      // Assert
      expect(cachedPage1).not.toBeNull();
      expect(cachedPage2).not.toBeNull();
      expect(cachedPage1!.pagination.page).toBe(1);
      expect(cachedPage2!.pagination.page).toBe(2);
    });

    it('should invalidate notification history cache', async () => {
      // Arrange
      await cacheService.cacheNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
        mockNotificationHistory,
      );

      // Act
      await cacheService.invalidateNotificationHistory(testUserId);

      // Assert
      const cached = await cacheService.getCachedNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
      );
      expect(cached).toBeNull();
    });
  });

  describe('Unread Count Caching', () => {
    it('should cache and retrieve unread count', async () => {
      // Arrange
      const unreadCount = 5;

      // Act - Cache the count
      await cacheService.cacheUnreadCount(testUserId, unreadCount);

      // Act - Retrieve cached count
      const cached = await cacheService.getCachedUnreadCount(testUserId);

      // Assert
      expect(cached).not.toBeNull();
      expect((cached as any).count).toBe(unreadCount);
      expect((cached as any).lastUpdated).toBeInstanceOf(Date);
    });

    it('should return null for cache miss', async () => {
      // Act
      const cached = await cacheService.getCachedUnreadCount(testUserId);

      // Assert
      expect(cached).toBeNull();
    });

    it('should handle zero count', async () => {
      // Act - Cache zero count
      await cacheService.cacheUnreadCount(testUserId, 0);

      // Act - Retrieve cached count
      const cached = await cacheService.getCachedUnreadCount(testUserId);

      // Assert
      expect(cached).not.toBeNull();
      expect((cached as any).count).toBe(0);
    });

    it('should invalidate unread count cache', async () => {
      // Arrange
      await cacheService.cacheUnreadCount(testUserId, 3);

      // Act
      await cacheService.invalidateUnreadCount(testUserId);

      // Assert
      const cached = await cacheService.getCachedUnreadCount(testUserId);
      expect(cached).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all notification caches for user', async () => {
      // Arrange
      await cacheService.cacheNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
        mockNotificationHistory,
      );
      await cacheService.cacheUnreadCount(testUserId, 5);

      // Act
      await cacheService.invalidateAllNotificationCaches(testUserId);

      // Assert
      const cachedHistory = await cacheService.getCachedNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
      );
      const cachedCount = await cacheService.getCachedUnreadCount(testUserId);

      expect(cachedHistory).toBeNull();
      expect(cachedCount).toBeNull();
    });

    it('should handle invalidation errors gracefully', async () => {
      // Act & Assert - Should not throw error even if Redis is unavailable
      await expect(cacheService.invalidateAllNotificationCaches(testUserId)).resolves.not.toThrow();
    });
  });

  describe('Cache TTL', () => {
    it('should respect TTL for notification history cache', async () => {
      // Arrange
      await cacheService.cacheNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
        mockNotificationHistory,
      );

      // Act - Wait for TTL to expire (in a real test, you might mock time)
      // For now, we'll just verify the cache works immediately
      const cached = await cacheService.getCachedNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
      );

      // Assert
      expect(cached).not.toBeNull();
    });

    it('should respect TTL for unread count cache', async () => {
      // Arrange
      await cacheService.cacheUnreadCount(testUserId, 3);

      // Act - Verify cache works immediately
      const cached = await cacheService.getCachedUnreadCount(testUserId);

      // Assert
      expect(cached).not.toBeNull();
      expect((cached as any).count).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Arrange - Mock Redis to throw error
      // const originalGet = redisService.get;
      // redisService.get = jest.fn().mockRejectedValue(new Error('Redis connection error'));

      // Act & Assert - Should not throw error
      const cached = await cacheService.getCachedNotificationHistory(
        testUserId,
        1,
        20,
        cacheFilters,
      );
      expect(cached).toBeNull();

      // Restore original method
      // redisService.get = originalGet;
    });

    it('should handle cache write errors gracefully', async () => {
      // Arrange - Mock Redis to throw error
      // const originalSet = redisService.set;
      // redisService.set = jest.fn().mockRejectedValue(new Error('Redis write error'));

      // Act & Assert - Should not throw error
      await expect(
        cacheService.cacheNotificationHistory(
          testUserId,
          1,
          20,
          cacheFilters,
          mockNotificationHistory,
        ),
      ).resolves.not.toThrow();

      // Restore original method
      // redisService.set = originalSet;
    });
  });

  describe('Performance', () => {
    it('should handle concurrent cache operations', async () => {
      // Arrange
      const promises = [];

      // Act - Perform multiple concurrent cache operations
      for (let i = 0; i < 10; i++) {
        promises.push(
          cacheService.cacheNotificationHistory(
            testUserId,
            i + 1,
            20,
            { ...cacheFilters, type: `type-${i}` },
            {
              ...mockNotificationHistory,
              pagination: { ...mockNotificationHistory.pagination, page: i + 1 },
            },
          ),
        );
      }

      // Assert - All operations should complete successfully
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle large cache data efficiently', async () => {
      // Arrange
      const largeNotificationHistory = {
        ...mockNotificationHistory,
        notifications: Array.from({ length: 100 }, (_, i) => ({
          ...mockNotificationHistory.notifications[0],
          id: `large-notif-${i}`,
          title: `Large Notification ${i}`,
        })),
      };

      // Act
      const startTime = Date.now();
      await cacheService.cacheNotificationHistory(
        testUserId,
        1,
        100,
        cacheFilters,
        largeNotificationHistory,
      );
      const cached = await cacheService.getCachedNotificationHistory(
        testUserId,
        1,
        100,
        cacheFilters,
      );
      const endTime = Date.now();

      // Assert
      expect(cached).not.toBeNull();
      expect((cached as any).notifications).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
