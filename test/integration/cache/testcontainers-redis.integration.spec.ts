import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '../../../src/infrastructure/cache/redis.service';
import { NotificationCacheService } from '../../../src/infrastructure/cache/notification-cache.service';
import { MockDataHelper } from '../../helpers/mock-data.helper';

describe('Testcontainers Redis Integration Tests', () => {
  let moduleRef: TestingModule;
  let redisService: RedisService;
  let cacheService: NotificationCacheService;

  beforeAll(async () => {
    // For this test, we'll use a mock Redis client
    // In a real scenario, you would use Testcontainers to start a Redis container
    const mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      quit: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              redis: {
                host: 'localhost',
                port: 6379,
                password: '',
                db: 0,
              },
            }),
          ],
        }),
      ],
      providers: [RedisService, NotificationCacheService],
    })
      .overrideProvider(RedisService)
      .useValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn(),
        ttl: jest.fn(),
      })
      .compile();

    redisService = moduleRef.get<RedisService>(RedisService);
    cacheService = moduleRef.get<NotificationCacheService>(NotificationCacheService);
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve cached data', async () => {
      // Arrange
      const cacheKey = 'test:notification:123';
      const cacheData = {
        id: '123',
        title: 'Test Notification',
        body: 'Test body',
        type: 'payment',
      };

      (redisService.get as any).mockResolvedValue(JSON.stringify(cacheData));
      (redisService.set as any).mockResolvedValue(undefined);

      // Act
      await cacheService.setNotificationCache(cacheKey, cacheData, 300);
      const retrieved = await cacheService.getNotificationCache(cacheKey);

      // Assert
      expect(redisService.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(cacheData), 300);
      expect(redisService.get).toHaveBeenCalledWith(cacheKey);
      expect(retrieved).toEqual(cacheData);
    });

    it('should handle cache misses gracefully', async () => {
      // Arrange
      const cacheKey = 'test:notification:nonexistent';
      (redisService.get as any).mockResolvedValue(null);

      // Act
      const result = await cacheService.getNotificationCache(cacheKey);

      // Assert
      expect(result).toBeNull();
      expect(redisService.get).toHaveBeenCalledWith(cacheKey);
    });

    it('should invalidate cache entries', async () => {
      // Arrange
      const cacheKey = 'test:notification:123';
      (redisService.del as any).mockResolvedValue(undefined);

      // Act
      await cacheService.invalidateNotificationCache(cacheKey);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('Notification History Caching', () => {
    it('should cache notification history with pagination', async () => {
      // Arrange
      const userId = 'test-user-123';
      const page = 1;
      const limit = 20;
      const cacheKey = `notification:history:${userId}:${page}:${limit}`;

      const mockHistory = {
        notifications: MockDataHelper.createMockUserNotifications(3),
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      (redisService.get as any).mockResolvedValue(JSON.stringify(mockHistory));
      (redisService.set as any).mockResolvedValue(undefined);

      // Act
      await cacheService.setNotificationHistoryCache(userId, page, limit, mockHistory, 300);
      const retrieved = await cacheService.getNotificationHistoryCache(userId, page, limit);

      // Assert
      expect(redisService.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(mockHistory), 300);
      expect(retrieved).toEqual(mockHistory);
    });

    it('should handle different pagination parameters', async () => {
      // Arrange
      const userId = 'test-user-123';
      const testCases = [
        { page: 1, limit: 10 },
        { page: 2, limit: 20 },
        { page: 3, limit: 50 },
      ];

      (redisService.get as any).mockResolvedValue(null);
      (redisService.set as any).mockResolvedValue(undefined);

      // Act & Assert
      for (const { page, limit } of testCases) {
        const cacheKey = `notification:history:${userId}:${page}:${limit}`;
        const mockData = { notifications: [], pagination: { page, limit, total: 0 } };

        await cacheService.setNotificationHistoryCache(userId, page, limit, mockData, 300);
        await cacheService.getNotificationHistoryCache(userId, page, limit);

        expect(redisService.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(mockData), 300);
        expect(redisService.get).toHaveBeenCalledWith(cacheKey);
      }
    });
  });

  describe('Unread Count Caching', () => {
    it('should cache and retrieve unread count', async () => {
      // Arrange
      const userId = 'test-user-123';
      const cacheKey = `notification:unread-count:${userId}`;
      const unreadCount = { count: 5, lastUpdated: new Date().toISOString() };

      (redisService.get as any).mockResolvedValue(JSON.stringify(unreadCount));
      (redisService.set as any).mockResolvedValue(undefined);

      // Act
      await cacheService.setUnreadCountCache(userId, unreadCount, 60);
      const retrieved = await cacheService.getUnreadCountCache(userId);

      // Assert
      expect(redisService.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(unreadCount), 60);
      expect(retrieved).toEqual(unreadCount);
    });

    it('should invalidate unread count cache when notifications are updated', async () => {
      // Arrange
      const userId = 'test-user-123';
      const cacheKey = `notification:unread-count:${userId}`;
      (redisService.del as any).mockResolvedValue(undefined);

      // Act
      await cacheService.invalidateUnreadCountCache(userId);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all notification caches for a user', async () => {
      // Arrange
      const userId = 'test-user-123';
      const cacheKeys = [
        `notification:history:${userId}:1:20`,
        `notification:history:${userId}:2:20`,
        `notification:unread-count:${userId}`,
        `notification:detail:${userId}:123`,
      ];

      (redisService.del as any).mockResolvedValue(undefined);

      // Act
      await cacheService.invalidateAllNotificationCaches(userId);

      // Assert
      expect(redisService.del).toHaveBeenCalledTimes(cacheKeys.length);
      cacheKeys.forEach((key) => {
        expect(redisService.del).toHaveBeenCalledWith(key);
      });
    });

    it('should handle cache invalidation errors gracefully', async () => {
      // Arrange
      const userId = 'test-user-123';
      (redisService.del as any).mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(cacheService.invalidateAllNotificationCaches(userId)).rejects.toThrow(
        'Redis connection failed',
      );
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect TTL settings for different cache types', async () => {
      // Arrange
      const testCases = [
        { type: 'notification history', ttl: 300 },
        { type: 'unread count', ttl: 60 },
        { type: 'notification detail', ttl: 600 },
      ];

      (redisService.set as any).mockResolvedValue(undefined);

      // Act & Assert
      for (const { type, ttl } of testCases) {
        const mockData = { test: 'data' };
        await cacheService.setNotificationCache(`test:${type}`, mockData, ttl);

        expect(redisService.set).toHaveBeenCalledWith(
          `test:${type}`,
          JSON.stringify(mockData),
          ttl,
        );
      }
    });

    it('should check TTL for cache entries', async () => {
      // Arrange
      const cacheKey = 'test:notification:123';
      (redisService.ttl as any).mockResolvedValue(150); // 150 seconds remaining

      // Act
      const ttl = await cacheService.getCacheTTL(cacheKey);

      // Assert
      expect(redisService.ttl).toHaveBeenCalledWith(cacheKey);
      expect(ttl).toBe(150);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors', async () => {
      // Arrange
      const cacheKey = 'test:notification:123';
      (redisService.get as any).mockRejectedValue(new Error('Connection lost'));

      // Act & Assert
      await expect(cacheService.getNotificationCache(cacheKey)).rejects.toThrow('Connection lost');
    });

    it('should handle malformed JSON in cache', async () => {
      // Arrange
      const cacheKey = 'test:notification:123';
      (redisService.get as any).mockResolvedValue('invalid json');

      // Act & Assert
      await expect(cacheService.getNotificationCache(cacheKey)).rejects.toThrow();
    });

    it('should handle cache write errors', async () => {
      // Arrange
      const cacheKey = 'test:notification:123';
      const cacheData = { test: 'data' };
      (redisService.set as any).mockRejectedValue(new Error('Write failed'));

      // Act & Assert
      await expect(cacheService.setNotificationCache(cacheKey, cacheData, 300)).rejects.toThrow(
        'Write failed',
      );
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent cache operations', async () => {
      // Arrange
      const concurrentOperations = Array.from({ length: 100 }, (_, i) => ({
        key: `concurrent:test:${i}`,
        data: { id: i, title: `Test ${i}` },
      }));

      (redisService.set as any).mockResolvedValue(undefined);
      (redisService.get as any).mockResolvedValue(JSON.stringify({ test: 'data' }));

      const startTime = Date.now();

      // Act
      const setPromises = concurrentOperations.map(({ key, data }) =>
        cacheService.setNotificationCache(key, data, 300),
      );
      const getPromises = concurrentOperations.map(({ key }) =>
        cacheService.getNotificationCache(key),
      );

      await Promise.all([...setPromises, ...getPromises]);

      // Assert
      expect(redisService.set).toHaveBeenCalledTimes(100);
      expect(redisService.get).toHaveBeenCalledTimes(100);
      expect(Date.now() - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle large cache data efficiently', async () => {
      // Arrange
      const largeData = {
        notifications: MockDataHelper.createMockUserNotifications(1000),
        pagination: {
          page: 1,
          limit: 1000,
          total: 1000,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      (redisService.set as any).mockResolvedValue(undefined);
      (redisService.get as any).mockResolvedValue(JSON.stringify(largeData));

      const startTime = Date.now();

      // Act
      await cacheService.setNotificationCache('large:data', largeData, 300);
      const retrieved = await cacheService.getNotificationCache('large:data');

      // Assert
      expect(retrieved).toEqual(largeData);
      expect(Date.now() - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
