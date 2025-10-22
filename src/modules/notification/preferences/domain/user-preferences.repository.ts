import { UserPreferences } from './user-preferences.entity';

export interface UserPreferencesRepository {
  findByUserId(userId: string): Promise<UserPreferences | null>;
  save(preferences: UserPreferences): Promise<UserPreferences>;
  createDefault(userId: string): Promise<UserPreferences>;
  delete(userId: string): Promise<void>;
}
