import { ScheduledNotification } from '../domain/scheduled-notification.entity';
import { SchedulingFilters } from '../application/services/scheduling.service';

export interface SchedulingRepository {
  create(scheduledNotification: ScheduledNotification): Promise<ScheduledNotification>;
  findById(id: string): Promise<ScheduledNotification | null>;
  find(filters: SchedulingFilters): Promise<{
    scheduledNotifications: ScheduledNotification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  update(id: string, scheduledNotification: ScheduledNotification): Promise<ScheduledNotification>;
  delete(id: string): Promise<void>;
  findByUser(createdBy: string): Promise<ScheduledNotification[]>;
  findReadyForExecution(): Promise<ScheduledNotification[]>;
  getStatistics(): Promise<{
    total: number;
    pending: number;
    scheduled: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    active: number;
    inactive: number;
  }>;
  cleanupExpired(cutoffDate: Date): Promise<number>;
}
