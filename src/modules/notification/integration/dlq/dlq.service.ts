import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { Injectable, Get, Delete, Res, Logger } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../../infrastructure/database/schemas/user-notification.schema';

export interface DLQEntry {
  id: string;
  notificationId: string;
  userId: string;
  originalError: string;
  errorCode: string;
  retryCount: number;
  movedAt: Date;
  data: Record<string, any>;
}

export interface DLQStatistics {
  totalEntries: number;
  entriesByErrorCode: Record<string, number>;
  entriesByUser: Record<string, number>;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

@Injectable()
export class DLQService {
  private readonly logger = new Logger(DLQService.name);

  constructor(
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotificationDocument>,
  ) {}

  /**
   * Add notification to Dead Letter Queue
   */
  async addToDLQ(
    notification: UserNotificationDocument,
    error: Error,
    additionalData?: Record<string, any>,
  ): Promise<void> {
    try {
      this.logger.warn(`Adding notification ${notification.id} to DLQ`, {
        notificationId: notification.id,
        userId: notification.userId,
        error: error.message,
        retryCount: notification.retryCount,
      });

      // Update notification status to DLQ
      await this.userNotificationModel.updateOne(
        { id: notification.id },
        {
          $set: {
            status: 'dlq',
            errorMessage: `DLQ: ${error.message}`,
            errorCode: 'DLQ_MOVED',
            updatedAt: new Date(),
            data: {
              ...notification.data,
              dlqMovedAt: new Date(),
              dlqReason: error.message,
              dlqStack: error.stack,
              ...additionalData,
            },
          },
        },
      );

      this.logger.log(`Notification ${notification.id} moved to DLQ successfully`);
    } catch (dlqError) {
      this.logger.error(`Failed to move notification ${notification.id} to DLQ:`, dlqError);
      throw dlqError;
    }
  }

  /**
   * Get DLQ entries with pagination
   */
  async getDLQEntries(
    page: number = 1,
    limit: number = 50,
    filters?: {
      userId?: string;
      errorCode?: string;
      fromDate?: Date;
      toDate?: Date;
    },
  ): Promise<{
    entries: DLQEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const query: any = { status: 'dlq' };

      // Apply filters
      if (filters?.userId) {
        query.userId = filters.userId;
      }
      if (filters?.errorCode) {
        query.errorCode = filters.errorCode;
      }
      if (filters?.fromDate || filters?.toDate) {
        query.updatedAt = {};
        if (filters.fromDate) {
          query.updatedAt.$gte = filters.fromDate;
        }
        if (filters.toDate) {
          query.updatedAt.$lte = filters.toDate;
        }
      }

      const skip = (page - 1) * limit;

      const [entries, total] = await Promise.all([
        this.userNotificationModel
          .find(query)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userNotificationModel.countDocuments(query),
      ]);

      const dlqEntries: DLQEntry[] = entries.map((entry) => ({
        id: entry.id,
        notificationId: entry.notificationId,
        userId: entry.userId,
        originalError: entry.errorMessage || 'Unknown error',
        errorCode: entry.errorCode || 'UNKNOWN',
        retryCount: entry.retryCount,
        movedAt: entry.updatedAt,
        data: entry.data,
      }));

      return {
        entries: dlqEntries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Failed to get DLQ entries:', error);
      throw error;
    }
  }

  /**
   * Get DLQ statistics
   */
  async getDLQStatistics(): Promise<DLQStatistics> {
    try {
      const [totalEntries, entriesByErrorCode, entriesByUser, oldestEntry, newestEntry] =
        await Promise.all([
          this.userNotificationModel.countDocuments({ status: 'dlq' }),
          this.getEntriesByErrorCode(),
          this.getEntriesByUser(),
          this.getOldestEntry(),
          this.getNewestEntry(),
        ]);

      return {
        totalEntries,
        entriesByErrorCode,
        entriesByUser,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      this.logger.error('Failed to get DLQ statistics:', error);
      throw error;
    }
  }

  /**
   * Retry DLQ entry
   */
  async retryDLQEntry(notificationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const notification = await this.userNotificationModel.findOne({
        id: notificationId,
        status: 'dlq',
      });

      if (!notification) {
        return { success: false, message: 'DLQ entry not found' };
      }

      // Reset notification for retry
      await this.userNotificationModel.updateOne(
        { id: notificationId },
        {
          $set: {
            status: 'pending',
            retryCount: 0,
            errorMessage: null,
            errorCode: null,
            updatedAt: new Date(),
            data: {
              ...notification.data,
              dlqRetriedAt: new Date(),
              dlqRetryCount: (notification.data.dlqRetryCount || 0) + 1,
            },
          },
        },
      );

      this.logger.log(`DLQ entry ${notificationId} reset for retry`);
      return { success: true, message: 'DLQ entry reset for retry' };
    } catch (error) {
      this.logger.error(`Failed to retry DLQ entry ${notificationId}:`, error);
      return { success: false, message: `Retry failed: ${error.message}` };
    }
  }

  /**
   * Delete DLQ entry permanently
   */
  async deleteDLQEntry(notificationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.userNotificationModel.deleteOne({
        id: notificationId,
        status: 'dlq',
      });

      if (result.deletedCount === 0) {
        return { success: false, message: 'DLQ entry not found' };
      }

      this.logger.log(`DLQ entry ${notificationId} deleted permanently`);
      return { success: true, message: 'DLQ entry deleted' };
    } catch (error) {
      this.logger.error(`Failed to delete DLQ entry ${notificationId}:`, error);
      return { success: false, message: `Delete failed: ${error.message}` };
    }
  }

  /**
   * Bulk retry DLQ entries
   */
  async bulkRetryDLQEntries(notificationIds: string[]): Promise<{
    success: number;
    failed: number;
    results: Array<{ id: string; success: boolean; message: string }>;
  }> {
    const results: Array<{ id: string; success: boolean; message: string }> = [];
    let success = 0;
    let failed = 0;

    for (const notificationId of notificationIds) {
      const result = await this.retryDLQEntry(notificationId);
      results.push({ id: notificationId, ...result });

      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    this.logger.log(`Bulk retry completed: ${success} success, ${failed} failed`);
    return { success, failed, results };
  }

  /**
   * Bulk delete DLQ entries
   */
  async bulkDeleteDLQEntries(notificationIds: string[]): Promise<{
    success: number;
    failed: number;
    results: Array<{ id: string; success: boolean; message: string }>;
  }> {
    const results: Array<{ id: string; success: boolean; message: string }> = [];
    let success = 0;
    let failed = 0;

    for (const notificationId of notificationIds) {
      const result = await this.deleteDLQEntry(notificationId);
      results.push({ id: notificationId, ...result });

      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    this.logger.log(`Bulk delete completed: ${success} success, ${failed} failed`);
    return { success, failed, results };
  }

  /**
   * Cleanup old DLQ entries (older than specified days)
   */
  async cleanupOldEntries(daysOld: number = 30): Promise<{ deletedCount: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.userNotificationModel.deleteMany({
        status: 'dlq',
        updatedAt: { $lt: cutoffDate },
      });

      this.logger.log(`Cleaned up ${result.deletedCount} old DLQ entries`);
      return { deletedCount: result.deletedCount };
    } catch (error) {
      this.logger.error('Failed to cleanup old DLQ entries:', error);
      throw error;
    }
  }

  /**
   * Get entries grouped by error code
   */
  private async getEntriesByErrorCode(): Promise<Record<string, number>> {
    const pipeline = [
      { $match: { status: 'dlq' } },
      { $group: { _id: '$errorCode', count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ];

    const result = await this.userNotificationModel.aggregate(pipeline);
    return result.reduce(
      (acc, item) => {
        acc[item._id || 'UNKNOWN'] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get entries grouped by user
   */
  private async getEntriesByUser(): Promise<Record<string, number>> {
    const pipeline = [
      { $match: { status: 'dlq' } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
      { $limit: 10 }, // Top 10 users with most DLQ entries
    ];

    const result = await this.userNotificationModel.aggregate(pipeline);
    return result.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get oldest DLQ entry date
   */
  private async getOldestEntry(): Promise<Date | null> {
    const result = await this.userNotificationModel
      .findOne({ status: 'dlq' })
      .sort({ updatedAt: 1 })
      .select('updatedAt')
      .exec();

    return result?.updatedAt || null;
  }

  /**
   * Get newest DLQ entry date
   */
  private async getNewestEntry(): Promise<Date | null> {
    const result = await this.userNotificationModel
      .findOne({ status: 'dlq' })
      .sort({ updatedAt: -1 })
      .select('updatedAt')
      .exec();

    return result?.updatedAt || null;
  }
}
