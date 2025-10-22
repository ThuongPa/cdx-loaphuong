import { NotificationAggregate } from './notification.aggregate';
import { Get, Delete } from '@nestjs/common';
import { Type } from 'class-transformer';

export interface NotificationRepository {
  /**
   * Save notification aggregate
   */
  save(notification: NotificationAggregate): Promise<void>;

  /**
   * Find notification by ID
   */
  findById(id: string): Promise<NotificationAggregate | null>;

  /**
   * Find notifications by status
   */
  findByStatus(status: string): Promise<NotificationAggregate[]>;

  /**
   * Find notifications by target roles
   */
  findByTargetRoles(roles: string[]): Promise<NotificationAggregate[]>;

  /**
   * Find notifications by target users
   */
  findByTargetUsers(userIds: string[]): Promise<NotificationAggregate[]>;

  /**
   * Update notification status
   */
  updateStatus(id: string, status: string): Promise<void>;

  /**
   * Delete notification
   */
  delete(id: string): Promise<void>;

  /**
   * Find notifications for retry (failed status)
   */
  findForRetry(): Promise<NotificationAggregate[]>;

  /**
   * Batch save notifications
   */
  batchSave(notifications: NotificationAggregate[]): Promise<void>;

  /**
   * Count notifications by status
   */
  countByStatus(status: string): Promise<number>;

  /**
   * Get user notification statistics and breakdowns
   */
  getUserStatistics(
    userId: string,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<{
    total: number;
    unread: number;
    read: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }>;
}
