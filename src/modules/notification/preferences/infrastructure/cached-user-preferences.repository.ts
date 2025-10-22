import { Injectable } from '@nestjs/common';
import { UserPreferencesRepository } from '../domain/user-preferences.repository';
import { UserPreferences } from '../domain/user-preferences.entity';
import { UserPreferencesRepositoryImpl } from './user-preferences.repository.impl';
import { PreferencesCacheService } from './preferences-cache.service';

@Injectable()
export class CachedUserPreferencesRepository implements UserPreferencesRepository {
  constructor(
    private readonly repository: UserPreferencesRepositoryImpl,
    private readonly cacheService: PreferencesCacheService,
  ) {}

  async findByUserId(userId: string): Promise<UserPreferences | null> {
    // Try cache first
    const cached = await this.cacheService.get(userId);
    if (cached) {
      return cached;
    }

    // Fallback to database
    const preferences = await this.repository.findByUserId(userId);
    if (preferences) {
      // Cache the result
      await this.cacheService.set(userId, preferences);
    }

    return preferences;
  }

  async save(preferences: UserPreferences): Promise<UserPreferences> {
    // Save to database
    const saved = await this.repository.save(preferences);

    // Update cache
    await this.cacheService.set(preferences.userId, saved);

    return saved;
  }

  async createDefault(userId: string): Promise<UserPreferences> {
    // Create in database
    const preferences = await this.repository.createDefault(userId);

    // Cache the result
    await this.cacheService.set(userId, preferences);

    return preferences;
  }

  async delete(userId: string): Promise<void> {
    // Delete from database
    await this.repository.delete(userId);

    // Invalidate cache
    await this.cacheService.invalidate(userId);
  }
}
