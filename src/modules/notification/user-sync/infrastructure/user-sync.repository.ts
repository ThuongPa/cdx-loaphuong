import { UserSync } from '../domain/user-sync.entity';
import { UserSyncFilters } from '../application/services/user-sync.service';

export interface UserSyncRepository {
  create(userSync: UserSync): Promise<UserSync>;
  findById(id: string): Promise<UserSync | null>;
  findByUserId(userId: string): Promise<UserSync[]>;
  update(id: string, userSync: UserSync): Promise<UserSync>;
  delete(id: string): Promise<void>;
  find(filters: UserSyncFilters): Promise<UserSync[]>;
  findByStatus(status: string): Promise<UserSync[]>;
  findFailedForRetry(): Promise<UserSync[]>;
  bulkUpdateStatus(ids: string[], status: string, errorMessage?: string): Promise<void>;
  cleanupOldSyncs(cutoffDate: Date): Promise<number>;
}
