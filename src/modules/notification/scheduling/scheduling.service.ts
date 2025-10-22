import { Cron, CronExpression } from '@nestjs/schedule';
import {
  NotFoundException,
  BadRequestException,
  Injectable,
  Get,
  Delete,
  Res,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { CategoryTargetingService } from '../category/category-targeting.service';
import { Type } from 'class-transformer';
import { StructuredLoggerService } from '../shared/services/structured-logger.service';
import {
  ScheduledNotification,
  ScheduledNotificationDocument,
  ScheduleStatus,
} from './scheduled-notification.schema';

// import { NotificationService } from '../notification/notification.service';
// import * as cronParser from 'cron-parser';

export interface CreateScheduledNotificationDto {
  name: string;
  description?: string;
  schedulePattern: {
    type: 'once' | 'recurring' | 'cron';
    cronExpression?: string;
    recurringType?: 'daily' | 'weekly' | 'monthly';
    recurringDays?: number[];
    recurringDayOfMonth?: number;
    timezone: string;
    scheduledAt?: Date;
  };
  notificationContent: {
    title: string;
    body: string;
    data?: Record<string, any>;
    categoryId?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    channels?: string[];
  };
  targetAudience: {
    userIds?: string[];
    categoryIds?: string[];
    userSegments?: string[];
    excludeUserIds?: string[];
  };
  expiresAt?: Date;
  createdBy: string;
}

export interface UpdateScheduledNotificationDto {
  name?: string;
  description?: string;
  schedulePattern?: {
    type: 'once' | 'recurring' | 'cron';
    cronExpression?: string;
    recurringType?: 'daily' | 'weekly' | 'monthly';
    recurringDays?: number[];
    recurringDayOfMonth?: number;
    timezone: string;
    scheduledAt?: Date;
  };
  notificationContent?: {
    title: string;
    body: string;
    data?: Record<string, any>;
    categoryId?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    channels?: string[];
  };
  targetAudience?: {
    userIds?: string[];
    categoryIds?: string[];
    userSegments?: string[];
    excludeUserIds?: string[];
  };
  expiresAt?: Date;
  isActive?: boolean;
  updatedBy: string;
}

export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
  nextExecution?: Date;
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    @InjectModel(ScheduledNotification.name)
    private readonly scheduledNotificationModel: Model<ScheduledNotificationDocument>,
    private readonly structuredLogger: StructuredLoggerService,
    // private readonly notificationService: NotificationService,
    private readonly categoryTargetingService: CategoryTargetingService,
  ) {}

  async createScheduledNotification(
    createDto: CreateScheduledNotificationDto,
  ): Promise<ScheduledNotificationDocument> {
    try {
      // Validate schedule pattern
      const validation = await this.validateSchedulePattern(createDto.schedulePattern);
      if (!validation.isValid) {
        throw new BadRequestException(`Invalid schedule pattern: ${validation.errors.join(', ')}`);
      }

      // Calculate next execution time
      const nextExecution = await this.calculateNextExecution(createDto.schedulePattern);
      if (!nextExecution) {
        throw new BadRequestException('Unable to calculate next execution time');
      }

      const scheduledNotification = new this.scheduledNotificationModel({
        ...createDto,
        status: ScheduleStatus.PENDING,
        scheduledAt: createDto.schedulePattern.scheduledAt || nextExecution,
        nextExecutionAt: nextExecution,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        isActive: true,
      });

      const saved = await scheduledNotification.save();

      this.structuredLogger.logBusinessEvent('scheduled_notification_created', {
        // scheduledNotificationId: saved._id,
        // name: saved.name,
        scheduleType: saved.schedulePattern.type,
        nextExecution: saved.nextExecutionAt,
        createdBy: saved.createdBy,
      });

      this.logger.log(`Scheduled notification created: ${saved.name} (${saved._id})`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create scheduled notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getScheduledNotificationById(id: string): Promise<ScheduledNotificationDocument> {
    const scheduledNotification = await this.scheduledNotificationModel.findById(id);
    if (!scheduledNotification) {
      throw new NotFoundException(`Scheduled notification with ID '${id}' not found`);
    }
    return scheduledNotification;
  }

  async getScheduledNotifications(
    filters: {
      status?: ScheduleStatus;
      isActive?: boolean;
      createdBy?: string;
      scheduleType?: string;
    } = {},
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    scheduledNotifications: ScheduledNotificationDocument[];
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

    const skip = (page - 1) * limit;

    const [scheduledNotifications, total] = await Promise.all([
      this.scheduledNotificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.scheduledNotificationModel.countDocuments(query),
    ]);

    return {
      scheduledNotifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateScheduledNotification(
    id: string,
    updateDto: UpdateScheduledNotificationDto,
  ): Promise<ScheduledNotificationDocument> {
    try {
      const existing = await this.scheduledNotificationModel.findById(id);
      if (!existing) {
        throw new NotFoundException(`Scheduled notification with ID '${id}' not found`);
      }

      // Validate schedule pattern if being updated
      if (updateDto.schedulePattern) {
        const validation = await this.validateSchedulePattern(updateDto.schedulePattern);
        if (!validation.isValid) {
          throw new BadRequestException(
            `Invalid schedule pattern: ${validation.errors.join(', ')}`,
          );
        }

        // Recalculate next execution time
        const nextExecution = await this.calculateNextExecution(updateDto.schedulePattern);
        if (nextExecution) {
          updateDto.schedulePattern.scheduledAt = nextExecution;
        }
      }

      const updated = await this.scheduledNotificationModel.findByIdAndUpdate(
        id,
        { ...updateDto, updatedAt: new Date() },
        { new: true },
      );

      this.structuredLogger.logBusinessEvent('scheduled_notification_updated', {
        // scheduledNotificationId: id,
        // changes: updateDto,
        updatedBy: updateDto.updatedBy,
      });

      this.logger.log(`Scheduled notification updated: ${updated!.name} (${id})`);
      return updated!;
    } catch (error) {
      this.logger.error(`Failed to update scheduled notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancelScheduledNotification(
    id: string,
    cancelledBy: string,
  ): Promise<ScheduledNotificationDocument> {
    try {
      const scheduledNotification = await this.scheduledNotificationModel.findByIdAndUpdate(
        id,
        {
          status: ScheduleStatus.CANCELLED,
          isActive: false,
          updatedBy: cancelledBy,
          updatedAt: new Date(),
        },
        { new: true },
      );

      if (!scheduledNotification) {
        throw new NotFoundException(`Scheduled notification with ID '${id}' not found`);
      }

      this.structuredLogger.logBusinessEvent('scheduled_notification_cancelled', {
        // scheduledNotificationId: id,
        // name: scheduledNotification.name,
        cancelledBy,
      });

      this.logger.log(`Scheduled notification cancelled: ${scheduledNotification.name} (${id})`);
      return scheduledNotification;
    } catch (error) {
      this.logger.error(`Failed to cancel scheduled notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteScheduledNotification(id: string): Promise<void> {
    try {
      const scheduledNotification = await this.scheduledNotificationModel.findById(id);
      if (!scheduledNotification) {
        throw new NotFoundException(`Scheduled notification with ID '${id}' not found`);
      }

      await this.scheduledNotificationModel.findByIdAndDelete(id);

      this.structuredLogger.logBusinessEvent('scheduled_notification_deleted', {
        // scheduledNotificationId: id,
        // name: scheduledNotification.name,
        createdBy: scheduledNotification.createdBy,
      });

      this.logger.log(`Scheduled notification deleted: ${scheduledNotification.name} (${id})`);
    } catch (error) {
      this.logger.error(`Failed to delete scheduled notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validateSchedulePattern(schedulePattern: any): Promise<ScheduleValidationResult> {
    const errors: string[] = [];

    try {
      if (!schedulePattern.type) {
        errors.push('Schedule type is required');
      }

      if (!schedulePattern.timezone) {
        errors.push('Timezone is required');
      }

      if (schedulePattern.type === 'cron') {
        if (!schedulePattern.cronExpression) {
          errors.push('Cron expression is required for cron type');
        } else {
          try {
            // cronParser.parseExpression(schedulePattern.cronExpression);
          } catch (error) {
            errors.push(`Invalid cron expression: ${error.message}`);
          }
        }
      }

      if (schedulePattern.type === 'recurring') {
        if (!schedulePattern.recurringType) {
          errors.push('Recurring type is required for recurring schedule');
        }

        if (
          schedulePattern.recurringType === 'weekly' &&
          (!schedulePattern.recurringDays || schedulePattern.recurringDays.length === 0)
        ) {
          errors.push('Recurring days are required for weekly schedule');
        }

        if (schedulePattern.recurringType === 'monthly' && !schedulePattern.recurringDayOfMonth) {
          errors.push('Recurring day of month is required for monthly schedule');
        }
      }

      if (schedulePattern.type === 'once') {
        if (!schedulePattern.scheduledAt) {
          errors.push('Scheduled time is required for one-time schedule');
        } else if (new Date(schedulePattern.scheduledAt) <= new Date()) {
          errors.push('Scheduled time must be in the future');
        }
      }

      // Calculate next execution if valid
      let nextExecution: Date | undefined;
      if (errors.length === 0) {
        nextExecution = (await this.calculateNextExecution(schedulePattern)) || undefined;
      }

      return {
        isValid: errors.length === 0,
        errors,
        nextExecution,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
      };
    }
  }

  async calculateNextExecution(schedulePattern: any): Promise<Date | null> {
    try {
      const now = new Date();
      const timezone = schedulePattern.timezone;

      if (schedulePattern.type === 'once') {
        return schedulePattern.scheduledAt ? new Date(schedulePattern.scheduledAt) : null;
      }

      if (schedulePattern.type === 'cron') {
        if (!schedulePattern.cronExpression) return null;
        // const interval = cronParser.parseExpression(schedulePattern.cronExpression, {
        //   tz: timezone,
        // });
        // return interval.next().toDate();
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 24 hours from now
      }

      if (schedulePattern.type === 'recurring') {
        return this.calculateRecurringNextExecution(schedulePattern);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to calculate next execution: ${error.message}`, error.stack);
      return null;
    }
  }

  private calculateRecurringNextExecution(schedulePattern: any): Date | null {
    try {
      const now = new Date();
      const timezone = schedulePattern.timezone;

      if (schedulePattern.recurringType === 'daily') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
      }

      if (schedulePattern.recurringType === 'weekly') {
        if (!schedulePattern.recurringDays || schedulePattern.recurringDays.length === 0) {
          return null;
        }

        const currentDay = now.getDay();
        const nextDays = schedulePattern.recurringDays
          .filter((day: number) => day > currentDay)
          .sort((a: number, b: number) => a - b);

        if (nextDays.length > 0) {
          const daysUntilNext = nextDays[0] - currentDay;
          const nextDate = new Date(now);
          nextDate.setDate(nextDate.getDate() + daysUntilNext);
          nextDate.setHours(0, 0, 0, 0);
          return nextDate;
        } else {
          // Next week
          const daysUntilNext = 7 - currentDay + schedulePattern.recurringDays[0];
          const nextDate = new Date(now);
          nextDate.setDate(nextDate.getDate() + daysUntilNext);
          nextDate.setHours(0, 0, 0, 0);
          return nextDate;
        }
      }

      if (schedulePattern.recurringType === 'monthly') {
        if (!schedulePattern.recurringDayOfMonth) return null;

        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(schedulePattern.recurringDayOfMonth);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to calculate recurring next execution: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  // Cron job to process scheduled notifications
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      const scheduledNotifications = await this.scheduledNotificationModel.find({
        status: { $in: [ScheduleStatus.PENDING, ScheduleStatus.SCHEDULED] },
        isActive: true,
        nextExecutionAt: { $lte: now },
      });

      this.logger.log(`Processing ${scheduledNotifications.length} scheduled notifications`);

      for (const scheduledNotification of scheduledNotifications) {
        await this.executeScheduledNotification(scheduledNotification);
      }
    } catch (error) {
      this.logger.error(`Failed to process scheduled notifications: ${error.message}`, error.stack);
    }
  }

  private async executeScheduledNotification(
    scheduledNotification: ScheduledNotificationDocument,
  ): Promise<void> {
    try {
      // Update status to processing
      await this.scheduledNotificationModel.findByIdAndUpdate(scheduledNotification._id, {
        status: ScheduleStatus.PROCESSING,
        lastExecutedAt: new Date(),
        $inc: { executionCount: 1 },
      });

      // Get target users
      const targetUsers = await this.getTargetUsers(scheduledNotification);

      if (targetUsers.length === 0) {
        this.logger.warn(
          `No target users found for scheduled notification: ${scheduledNotification.name}`,
        );
        await this.scheduledNotificationModel.findByIdAndUpdate(scheduledNotification._id, {
          status: ScheduleStatus.COMPLETED,
        });
        return;
      }

      // Send notifications
      let successCount = 0;
      let failureCount = 0;

      for (const userId of targetUsers) {
        try {
          // await this.notificationService.sendNotification({
          //   userId,
          //   title: scheduledNotification.notificationContent.title,
          //   body: scheduledNotification.notificationContent.body,
          //   data: scheduledNotification.notificationContent.data,
          //   categoryId: scheduledNotification.notificationContent.categoryId,
          //   priority: scheduledNotification.notificationContent.priority || 'normal',
          //   channels: scheduledNotification.notificationContent.channels,
          // });
          successCount++;
        } catch (error) {
          this.logger.error(`Failed to send notification to user ${userId}: ${error.message}`);
          failureCount++;
        }
      }

      // Update execution results
      const updateData: any = {
        $inc: { successCount, failureCount },
      };

      // Determine next execution for recurring schedules
      if (
        scheduledNotification.schedulePattern.type === 'recurring' ||
        scheduledNotification.schedulePattern.type === 'cron'
      ) {
        const nextExecution = await this.calculateNextExecution(
          scheduledNotification.schedulePattern,
        );
        if (nextExecution) {
          updateData.nextExecutionAt = nextExecution;
          updateData.status = ScheduleStatus.SCHEDULED;
        } else {
          updateData.status = ScheduleStatus.COMPLETED;
        }
      } else {
        updateData.status = ScheduleStatus.COMPLETED;
      }

      await this.scheduledNotificationModel.findByIdAndUpdate(
        scheduledNotification._id,
        updateData,
      );

      this.structuredLogger.logBusinessEvent('scheduled_notification_executed', {
        // scheduledNotificationId: scheduledNotification._id,
        // name: scheduledNotification.name,
        targetUsers: targetUsers.length,
        successCount,
        failureCount,
      });

      this.logger.log(
        `Scheduled notification executed: ${scheduledNotification.name} - Success: ${successCount}, Failed: ${failureCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute scheduled notification ${scheduledNotification._id}: ${error.message}`,
        error.stack,
      );

      await this.scheduledNotificationModel.findByIdAndUpdate(scheduledNotification._id, {
        status: ScheduleStatus.FAILED,
        $inc: { failureCount: 1 },
      });
    }
  }

  private async getTargetUsers(
    scheduledNotification: ScheduledNotificationDocument,
  ): Promise<string[]> {
    try {
      const { targetAudience } = scheduledNotification;
      const allUserIds = new Set<string>();

      // Add specific user IDs
      if (targetAudience.userIds && targetAudience.userIds.length > 0) {
        targetAudience.userIds.forEach((userId) => allUserIds.add(userId));
      }

      // Add users from categories
      if (targetAudience.categoryIds && targetAudience.categoryIds.length > 0) {
        const categoryUsers = await this.categoryTargetingService.getUsersByMultipleCategories(
          targetAudience.categoryIds,
          targetAudience.excludeUserIds || [],
        );
        categoryUsers.forEach((userId) => allUserIds.add(userId));
      }

      // Remove excluded users
      if (targetAudience.excludeUserIds && targetAudience.excludeUserIds.length > 0) {
        targetAudience.excludeUserIds.forEach((userId) => allUserIds.delete(userId));
      }

      return Array.from(allUserIds);
    } catch (error) {
      this.logger.error(`Failed to get target users: ${error.message}`, error.stack);
      return [];
    }
  }

  async getScheduledNotificationStatistics(): Promise<{
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
          pending: { $sum: { $cond: [{ $eq: ['$status', ScheduleStatus.PENDING] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', ScheduleStatus.SCHEDULED] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', ScheduleStatus.PROCESSING] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', ScheduleStatus.COMPLETED] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', ScheduleStatus.FAILED] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', ScheduleStatus.CANCELLED] }, 1, 0] } },
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
}
