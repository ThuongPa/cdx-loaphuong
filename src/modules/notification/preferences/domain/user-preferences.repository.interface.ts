import { UserPreferences } from './user-preferences.entity';

export interface UserPreferencesRepository {
  findByUserId(userId: string): Promise<UserPreferences | null>;
  findByUserIds(userIds: string[]): Promise<UserPreferences[]>;
  save(preferences: UserPreferences): Promise<UserPreferences>;
  createDefault(userId: string): Promise<UserPreferences>;
}
