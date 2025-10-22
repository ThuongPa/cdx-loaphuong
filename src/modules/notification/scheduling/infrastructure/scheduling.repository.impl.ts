import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ScheduledNotification } from '../domain/scheduled-notification.entity';
import { SchedulingRepository } from './scheduling.repository';
import { SchedulingFilters } from '../application/services/scheduling.service';
import {
  ScheduledNotificationDocument,
  ScheduledNotificationSchema,
} from '../scheduled-notification.schema';

@Injectable()
export class SchedulingRepositoryImpl implements SchedulingRepository {
  constructor(
    @InjectModel('ScheduledNotification')
    private scheduledNotificationModel: Model<ScheduledNotificationDocument>,
  ) {}

  async create(scheduledNotification: ScheduledNotification): Promise<ScheduledNotification> {
    const scheduledNotificationData = scheduledNotification.toPersistence();
    const created = await this.scheduledNotificationModel.create(scheduledNotificationData);
    return ScheduledNotification.fromPersistence(created);
  }

  async findById(id: string): Promise<ScheduledNotification | null> {
    const scheduledNotification = await this.scheduledNotificationModel.findById(id).exec();
    return scheduledNotification
      ? ScheduledNotification.fromPersistence(scheduledNotification)
      : null;
  }

  async find(filters: SchedulingFilters): Promise<{
    scheduledNotifications: ScheduledNotification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    if (filters.scheduleType) {
      query['schedulePattern.type'] = filters.scheduleType;
    }

    const limit = filters.limit || 10;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    const [scheduledNotifications, total] = await Promise.all([
      this.scheduledNotificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.scheduledNotificationModel.countDocuments(query),
    ]);

    return {
      scheduledNotifications: scheduledNotifications.map((sn) =>
        ScheduledNotification.fromPersistence(sn),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    scheduledNotification: ScheduledNotification,
  ): Promise<ScheduledNotification> {
    const scheduledNotificationData = scheduledNotification.toPersistence();
    const updated = await this.scheduledNotificationModel
      .findByIdAndUpdate(id, scheduledNotificationData, { new: true })
      .exec();
    return updated ? ScheduledNotification.fromPersistence(updated) : scheduledNotification;
  }

  async delete(id: string): Promise<void> {
    await this.scheduledNotificationModel.findByIdAndDelete(id).exec();
  }

  async findByUser(createdBy: string): Promise<ScheduledNotification[]> {
    const scheduledNotifications = await this.scheduledNotificationModel
      .find({ createdBy })
      .sort({ createdAt: -1 })
      .exec();

    return scheduledNotifications.map((sn) => ScheduledNotification.fromPersistence(sn));
  }

  async findReadyForExecution(): Promise<ScheduledNotification[]> {
    const now = new Date();
    const scheduledNotifications = await this.scheduledNotificationModel
      .find({
        status: { $in: ['pending', 'scheduled'] },
        isActive: true,
        nextExecutionAt: { $lte: now },
      })
      .exec();

    return scheduledNotifications.map((sn) => ScheduledNotification.fromPersistence(sn));
  }

  async getStatistics(): Promise<{
    total: number;
    pending: number;
    scheduled: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    active: number;
    inactive: number;
  }> {
    const stats = await this.scheduledNotificationModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
        },
      },
    ]);

    return (
      stats[0] || {
        total: 0,
        pending: 0,
        scheduled: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        active: 0,
        inactive: 0,
      }
    );
  }

  async cleanupExpired(cutoffDate: Date): Promise<number> {
    const result = await this.scheduledNotificationModel
      .deleteMany({
        status: 'completed',
        updatedAt: { $lt: cutoffDate },
      })
      .exec();

    return result.deletedCount || 0;
  }
}
