import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../../infrastructure/cache/redis.service';
import { UserPreferences } from '../domain/user-preferences.entity';

@Injectable()
export class PreferencesCacheService {
  private readonly CACHE_PREFIX = 'user_preferences:';
  private readonly TTL_SECONDS = 600; // 10 minutes

  constructor(private readonly redisService: RedisService) {}

  async get(userId: string): Promise<UserPreferences | null> {
    try {
      const key = `${this.CACHE_PREFIX}${userId}`;
      const cached = await this.redisService.get(key);

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);
      return new UserPreferences(
        data.id,
        data.userId,
        data.channelPreferences,
        data.typePreferences,
        data.quietHours,
        new Date(data.createdAt),
        new Date(data.updatedAt),
      );
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${userId}`;
      const data = {
        id: preferences.id,
        userId: preferences.userId,
        channelPreferences: preferences.channelPreferences,
        typePreferences: preferences.typePreferences,
        quietHours: preferences.quietHours,
        createdAt: preferences.createdAt.toISOString(),
        updatedAt: preferences.updatedAt.toISOString(),
      };

      await this.redisService.set(key, JSON.stringify(data), this.TTL_SECONDS);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(userId: string): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${userId}`;
      await this.redisService.del(key);
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  async getMultiple(userIds: string[]): Promise<Map<string, UserPreferences>> {
    const result = new Map<string, UserPreferences>();

    for (const userId of userIds) {
      const preferences = await this.get(userId);
      if (preferences) {
        result.set(userId, preferences);
      }
    }

    return result;
  }

  async setMultiple(preferencesMap: Map<string, UserPreferences>): Promise<void> {
    const promises = Array.from(preferencesMap.entries()).map(([userId, preferences]) =>
      this.set(userId, preferences),
    );

    await Promise.all(promises);
  }
}
