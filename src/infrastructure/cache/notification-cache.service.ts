import { RedisService } from './redis.service';
import { Injectable, Get, Logger } from '@nestjs/common';

export interface CachedNotificationHistory {
  notifications: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  cachedAt: Date;
}

export interface CachedUnreadCount {
  count: number;
  lastUpdated: Date;
}

@Injectable()
export class NotificationCacheService {
  private readonly logger = new Logger(NotificationCacheService.name);
  private readonly CACHE_TTL = 5 * 60; // 5 minutes in seconds
  private readonly UNREAD_COUNT_TTL = 2 * 60; // 2 minutes in seconds

  constructor(private readonly redisService: RedisService) {}

  /**
   * Generate cache key for notification history
   */
  private getNotificationHistoryKey(
    userId: string,
    page: number,
    limit: number,
    filters: {
      type?: string;
      channel?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: string;
    },
  ): string {
    const filterString = Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return `notification:history:${userId}:${page}:${limit}:${filterString}`;
  }

  /**
   * Generate cache key for unread count
   */
  private getUnreadCountKey(userId: string): string {
    return `notification:unread-count:${userId}`;
  }

  private getGenericKey(key: string): string {
    return `notification:cache:${key}`;
  }

  /**
   * Cache notification history
   */
  async cacheNotificationHistory(
    userId: string,
    page: number,
    limit: number,
    filters: {
      type?: string;
      channel?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: string;
    },
    data: CachedNotificationHistory,
  ): Promise<void> {
    try {
      const key = this.getNotificationHistoryKey(userId, page, limit, filters);
      const value = JSON.stringify(data);

      await this.redisService.set(key, value, this.CACHE_TTL);

      this.logger.log(`Cached notification history for user ${userId}, page ${page}`);
    } catch (error) {
      this.logger.error(`Failed to cache notification history: ${error.message}`, error.stack);
      // Don't throw error - caching failure shouldn't break the main flow
    }
  }

  async setNotificationHistoryCache(
    userId: string,
    page: number,
    limit: number,
    data: CachedNotificationHistory | { notifications: any[]; pagination: any },
    ttlSeconds: number = this.CACHE_TTL,
  ): Promise<void> {
    const normalized: CachedNotificationHistory = {
      notifications: (data as any).notifications || [],
      pagination: (data as any).pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
      cachedAt: new Date(),
    };
    return this.cacheNotificationHistory(userId, page, limit, {}, normalized);
  }

  /**
   * Get cached notification history
   */
  async getCachedNotificationHistory(
    userId: string,
    page: number,
    limit: number,
    filters: {
      type?: string;
      channel?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: string;
    },
  ): Promise<CachedNotificationHistory | null> {
    try {
      const key = this.getNotificationHistoryKey(userId, page, limit, filters);
      const cached = await this.redisService.get(key);

      if (cached) {
        const data = JSON.parse(cached) as CachedNotificationHistory;
        this.logger.log(`Retrieved cached notification history for user ${userId}, page ${page}`);
        return data;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get cached notification history: ${error.message}`, error.stack);
      return null;
    }
  }

  async getNotificationHistoryCache(
    userId: string,
    page: number,
    limit: number,
  ): Promise<CachedNotificationHistory | null> {
    return this.getCachedNotificationHistory(userId, page, limit, {});
  }

  /**
   * Cache unread count
   */
  async cacheUnreadCount(userId: string, count: number): Promise<void> {
    try {
      const key = this.getUnreadCountKey(userId);
      const data: CachedUnreadCount = {
        count,
        lastUpdated: new Date(),
      };
      const value = JSON.stringify(data);

      await this.redisService.set(key, value, this.UNREAD_COUNT_TTL);

      this.logger.log(`Cached unread count for user ${userId}: ${count}`);
    } catch (error) {
      this.logger.error(`Failed to cache unread count: ${error.message}`, error.stack);
      // Don't throw error - caching failure shouldn't break the main flow
    }
  }

  async setUnreadCountCache(
    userId: string,
    count: number | { count: number; lastUpdated?: string | Date },
    ttlSeconds: number = this.UNREAD_COUNT_TTL,
  ): Promise<void> {
    const value = typeof count === 'number' ? count : (count as any).count;
    return this.cacheUnreadCount(userId, value);
  }

  /**
   * Get cached unread count
   */
  async getCachedUnreadCount(userId: string): Promise<CachedUnreadCount | null> {
    try {
      const key = this.getUnreadCountKey(userId);
      const cached = await this.redisService.get(key);

      if (cached) {
        const data = JSON.parse(cached) as CachedUnreadCount;
        this.logger.log(`Retrieved cached unread count for user ${userId}: ${data.count}`);
        return data;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get cached unread count: ${error.message}`, error.stack);
      return null;
    }
  }

  async getUnreadCountCache(userId: string): Promise<CachedUnreadCount | null> {
    return this.getCachedUnreadCount(userId);
  }

  /**
   * Invalidate unread count cache for user
   */
  async invalidateUnreadCount(userId: string): Promise<void> {
    try {
      const key = this.getUnreadCountKey(userId);
      await this.redisService.del(key);

      this.logger.log(`Invalidated unread count cache for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate unread count cache: ${error.message}`, error.stack);
      // Don't throw error - cache invalidation failure shouldn't break the main flow
    }
  }

  async invalidateUnreadCountCache(userId: string): Promise<void> {
    return this.invalidateUnreadCount(userId);
  }

  async setNotificationCache(key: string, data: any, ttlSeconds: number): Promise<void> {
    try {
      const namespaced = this.getGenericKey(key);
      await this.redisService.set(namespaced, JSON.stringify(data), ttlSeconds);
    } catch (error) {
      this.logger.error(`Failed to set notification cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getNotificationCache<T = any>(key: string): Promise<T | null> {
    try {
      const namespaced = this.getGenericKey(key);
      const cached = await this.redisService.get(namespaced);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch (error) {
      this.logger.error(`Failed to get notification cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  async invalidateNotificationCache(key: string): Promise<void> {
    try {
      const namespaced = this.getGenericKey(key);
      await this.redisService.del(namespaced);
    } catch (error) {
      this.logger.error(`Failed to invalidate notification cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCacheTTL(key: string): Promise<number> {
    const namespaced = this.getGenericKey(key);
    return this.redisService.ttl(namespaced);
  }

  /**
   * Invalidate notification history cache for user
   */
  async invalidateNotificationHistory(userId: string): Promise<void> {
    try {
      // Get all keys matching the pattern for this user
      const pattern = `notification:history:${userId}:*`;
      const keys = await this.redisService.getClient().keys(pattern);

      if (keys.length > 0) {
        await this.redisService.getClient().del(keys);
        this.logger.log(
          `Invalidated ${keys.length} notification history cache entries for user ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to invalidate notification history cache: ${error.message}`,
        error.stack,
      );
      // Don't throw error - cache invalidation failure shouldn't break the main flow
    }
  }

  /**
   * Invalidate all notification caches for user
   */
  async invalidateAllNotificationCaches(userId: string): Promise<void> {
    try {
      await Promise.all([
        this.invalidateUnreadCount(userId),
        this.invalidateNotificationHistory(userId),
      ]);

      this.logger.log(`Invalidated all notification caches for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate all notification caches: ${error.message}`,
        error.stack,
      );
      // Don't throw error - cache invalidation failure shouldn't break the main flow
    }
  }
}
