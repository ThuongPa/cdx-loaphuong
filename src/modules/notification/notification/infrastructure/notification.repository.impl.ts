import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { NotificationAggregate } from '../domain/notification.aggregate';
import { NotificationFactory } from '../domain/notification.factory';
import { Injectable, Get, Delete, Logger } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  Notification,
  NotificationDocument,
} from '../../../../infrastructure/database/schemas/notification.schema';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../../infrastructure/database/schemas/user-notification.schema';
import { NotificationRepository } from '../domain/notification.repository';

@Injectable()
export class NotificationRepositoryImpl implements NotificationRepository {
  private readonly logger = new Logger(NotificationRepositoryImpl.name);

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotificationDocument>,
  ) {}

  async save(notification: NotificationAggregate): Promise<void> {
    try {
      const notificationData = notification.toPlainObject();

      await this.notificationModel.findOneAndUpdate({ id: notificationData.id }, notificationData, {
        upsert: true,
        new: true,
      });

      this.logger.log(`Notification saved: ${notificationData.id}`);
    } catch (error) {
      this.logger.error(`Failed to save notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<NotificationAggregate | null> {
    try {
      const notificationDoc = await this.notificationModel.findOne({ id }).exec();

      if (!notificationDoc) {
        return null;
      }

      return NotificationFactory.fromDatabaseData(notificationDoc.toObject());
    } catch (error) {
      this.logger.error(`Failed to find notification by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByStatus(status: string): Promise<NotificationAggregate[]> {
    try {
      const notificationDocs = await this.notificationModel
        .find({ status })
        .sort({ createdAt: -1 })
        .exec();

      return notificationDocs.map((doc) => NotificationFactory.fromDatabaseData(doc.toObject()));
    } catch (error) {
      this.logger.error(`Failed to find notifications by status: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByTargetRoles(roles: string[]): Promise<NotificationAggregate[]> {
    try {
      const notificationDocs = await this.notificationModel
        .find({ targetRoles: { $in: roles } })
        .sort({ createdAt: -1 })
        .exec();

      return notificationDocs.map((doc) => NotificationFactory.fromDatabaseData(doc.toObject()));
    } catch (error) {
      this.logger.error(
        `Failed to find notifications by target roles: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByTargetUsers(userIds: string[]): Promise<NotificationAggregate[]> {
    try {
      const notificationDocs = await this.notificationModel
        .find({ targetUsers: { $in: userIds } })
        .sort({ createdAt: -1 })
        .exec();

      return notificationDocs.map((doc) => NotificationFactory.fromDatabaseData(doc.toObject()));
    } catch (error) {
      this.logger.error(
        `Failed to find notifications by target users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateStatus(id: string, status: string): Promise<void> {
    try {
      await this.notificationModel
        .findOneAndUpdate({ id }, { status, updatedAt: new Date() })
        .exec();

      this.logger.log(`Notification status updated: ${id} -> ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update notification status: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.notificationModel.findOneAndDelete({ id }).exec();
      this.logger.log(`Notification deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findForRetry(): Promise<NotificationAggregate[]> {
    try {
      const notificationDocs = await this.notificationModel
        .find({ status: 'failed' })
        .sort({ createdAt: -1 })
        .exec();

      return notificationDocs.map((doc) => NotificationFactory.fromDatabaseData(doc.toObject()));
    } catch (error) {
      this.logger.error(`Failed to find notifications for retry: ${error.message}`, error.stack);
      throw error;
    }
  }

  async batchSave(notifications: NotificationAggregate[]): Promise<void> {
    try {
      const session = await this.notificationModel.db.startSession();

      await session.withTransaction(async () => {
        const operations = notifications.map((notification) => ({
          updateOne: {
            filter: { id: notification.id },
            update: notification.toPlainObject(),
            upsert: true,
          },
        }));

        await this.notificationModel.bulkWrite(operations, { session });
      });

      await session.endSession();
      this.logger.log(`Batch saved ${notifications.length} notifications`);
    } catch (error) {
      this.logger.error(`Failed to batch save notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  async countByStatus(status: string): Promise<number> {
    try {
      return await this.notificationModel.countDocuments({ status }).exec();
    } catch (error) {
      this.logger.error(`Failed to count notifications by status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Save user notification record
   */
  async saveUserNotification(userNotification: {
    id: string;
    userId: string;
    notificationId: string;
    title: string;
    body: string;
    type: string;
    channel: string;
    priority: string;
    status: string;
    data: Record<string, any>;
    sentAt?: Date;
    deliveredAt?: Date;
    errorMessage?: string;
    errorCode?: string;
    retryCount?: number;
    deliveryId?: string;
  }): Promise<void> {
    try {
      await this.userNotificationModel.findOneAndUpdate(
        { id: userNotification.id },
        userNotification,
        { upsert: true, new: true },
      );

      this.logger.log(`User notification saved: ${userNotification.id}`);
    } catch (error) {
      this.logger.error(`Failed to save user notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user notification status
   */
  async updateUserNotificationStatus(
    id: string,
    status: string,
    additionalData?: {
      sentAt?: Date;
      deliveredAt?: Date;
      readAt?: Date;
      errorMessage?: string;
      errorCode?: string;
      retryCount?: number;
      deliveryId?: string;
    },
  ): Promise<void> {
    try {
      const updateData: any = { status, updatedAt: new Date() };

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      await this.userNotificationModel.findOneAndUpdate({ id }, updateData).exec();

      this.logger.log(`User notification status updated: ${id} -> ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update user notification status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user notifications with optimized queries
   */
  async getUserNotifications(
    userId: string,
    options: {
      status?: string;
      channel?: string;
      type?: string;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<any[]> {
    try {
      const query: any = { userId };

      if (options.status) {
        query.status = options.status;
      }

      if (options.channel) {
        query.channel = options.channel;
      }

      if (options.type) {
        query.type = options.type;
      }

      // Add date range filter
      if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.createdAt.$lte = options.endDate;
        }
      }

      const limit = Math.min(100, options.limit || 50); // Max 100 per page
      const offset = options.offset || 0;

      const userNotifications = await this.userNotificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean() // Use lean() for better performance
        .exec();

      return userNotifications;
    } catch (error) {
      this.logger.error(`Failed to get user notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user notification count by status with optimized query
   */
  async getUserNotificationCount(userId: string, status?: string): Promise<number> {
    try {
      const query: any = { userId };

      if (status) {
        query.status = status;
      }

      return await this.userNotificationModel.countDocuments(query).lean().exec();
    } catch (error) {
      this.logger.error(`Failed to get user notification count: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserStatistics(
    userId: string,
    options: { startDate?: Date; endDate?: Date } = {},
  ): Promise<{
    total: number;
    unread: number;
    read: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      const match: any = { userId };
      if (options.startDate || options.endDate) {
        match.createdAt = {};
        if (options.startDate) match.createdAt.$gte = options.startDate;
        if (options.endDate) match.createdAt.$lte = options.endDate;
      }

      const pipeline = [
        { $match: match },
        {
          $facet: {
            total: [{ $count: 'count' }],
            unread: [{ $match: { status: 'delivered' } }, { $count: 'count' }],
            read: [{ $match: { status: 'read' } }, { $count: 'count' }],
            byType: [
              { $group: { _id: '$type', count: { $sum: 1 } } },
              { $project: { _id: 0, k: '$_id', v: '$count' } },
            ],
            byPriority: [
              { $group: { _id: '$priority', count: { $sum: 1 } } },
              { $project: { _id: 0, k: '$_id', v: '$count' } },
            ],
          },
        },
      ];

      const result = await this.userNotificationModel.aggregate(pipeline).exec();
      const first = result[0] || {};

      const toRecord = (arr: Array<{ k: string; v: number }> = []) =>
        Object.fromEntries(arr.map((i) => [i.k, i.v]));

      return {
        total: (first.total?.[0]?.count as number) || 0,
        unread: (first.unread?.[0]?.count as number) || 0,
        read: (first.read?.[0]?.count as number) || 0,
        byType: toRecord(first.byType),
        byPriority: toRecord(first.byPriority),
      };
    } catch (error) {
      this.logger.error(`Failed to get user statistics: ${error.message}`, error.stack);
      throw error;
    }
  }
}
