import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { ScheduledNotification } from '../../domain/scheduled-notification.entity';
import { SchedulingRepository } from '../../infrastructure/scheduling.repository';

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

export interface SchedulingFilters {
  status?: string;
  isActive?: boolean;
  createdBy?: string;
  scheduleType?: string;
  limit?: number;
  offset?: number;
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
    @Inject('SchedulingRepository') private readonly schedulingRepository: SchedulingRepository,
  ) {}

  async createScheduledNotification(
    createDto: CreateScheduledNotificationDto,
  ): Promise<ScheduledNotification> {
    this.logger.log(`Creating scheduled notification ${createDto.name}`);

    this.validateSchedulePattern(createDto.schedulePattern);

    const nextExecution = this.calculateNextExecution(createDto.schedulePattern);
    if (!nextExecution) {
      throw new BadRequestException('Unable to calculate next execution time');
    }

    const scheduledNotification = ScheduledNotification.create({
      name: createDto.name,
      description: createDto.description,
      schedulePattern: createDto.schedulePattern,
      notificationContent: createDto.notificationContent,
      targetAudience: createDto.targetAudience,
      status: 'pending',
      scheduledAt: createDto.schedulePattern.scheduledAt || nextExecution,
      nextExecutionAt: nextExecution,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      expiresAt: createDto.expiresAt,
      isActive: true,
      createdBy: createDto.createdBy,
    });

    return this.schedulingRepository.create(scheduledNotification);
  }

  async getScheduledNotificationById(id: string): Promise<ScheduledNotification> {
    const scheduledNotification = await this.schedulingRepository.findById(id);
    if (!scheduledNotification) {
      throw new NotFoundException(`Scheduled notification with ID ${id} not found`);
    }
    return scheduledNotification;
  }

  async getScheduledNotifications(filters: SchedulingFilters = {}): Promise<{
    scheduledNotifications: ScheduledNotification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.schedulingRepository.find(filters);
    return result;
  }

  async updateScheduledNotification(
    id: string,
    updateDto: UpdateScheduledNotificationDto,
  ): Promise<ScheduledNotification> {
    this.logger.log(`Updating scheduled notification ${id}`);

    const scheduledNotification = await this.getScheduledNotificationById(id);

    if (updateDto.name) {
      scheduledNotification.updateName(updateDto.name);
    }

    if (updateDto.description !== undefined) {
      scheduledNotification.updateDescription(updateDto.description);
    }

    if (updateDto.schedulePattern) {
      this.validateSchedulePattern(updateDto.schedulePattern);
      const nextExecution = this.calculateNextExecution(updateDto.schedulePattern);
      if (nextExecution) {
        updateDto.schedulePattern.scheduledAt = nextExecution;
      }
      scheduledNotification.updateSchedulePattern(updateDto.schedulePattern);
    }

    if (updateDto.notificationContent) {
      scheduledNotification.updateNotificationContent(updateDto.notificationContent);
    }

    if (updateDto.targetAudience) {
      scheduledNotification.updateTargetAudience(updateDto.targetAudience);
    }

    if (updateDto.expiresAt !== undefined) {
      scheduledNotification.updateExpiresAt(updateDto.expiresAt);
    }

    if (updateDto.isActive !== undefined) {
      if (updateDto.isActive) {
        scheduledNotification.activate();
      } else {
        scheduledNotification.deactivate();
      }
    }

    return this.schedulingRepository.update(id, scheduledNotification);
  }

  async cancelScheduledNotification(
    id: string,
    cancelledBy: string,
  ): Promise<ScheduledNotification> {
    this.logger.log(`Cancelling scheduled notification ${id}`);

    const scheduledNotification = await this.getScheduledNotificationById(id);
    scheduledNotification.updateStatus('cancelled');
    scheduledNotification.deactivate();
    scheduledNotification.updateMetadata({ cancelledBy, cancelledAt: new Date() });

    return this.schedulingRepository.update(id, scheduledNotification);
  }

  async deleteScheduledNotification(id: string): Promise<void> {
    this.logger.log(`Deleting scheduled notification ${id}`);

    const scheduledNotification = await this.getScheduledNotificationById(id);
    await this.schedulingRepository.delete(id);
  }

  async getScheduledNotificationsByUser(createdBy: string): Promise<ScheduledNotification[]> {
    return this.schedulingRepository.findByUser(createdBy);
  }

  async getReadyForExecution(): Promise<ScheduledNotification[]> {
    return this.schedulingRepository.findReadyForExecution();
  }

  async executeScheduledNotification(id: string): Promise<ScheduledNotification> {
    this.logger.log(`Executing scheduled notification ${id}`);

    const scheduledNotification = await this.getScheduledNotificationById(id);

    if (!scheduledNotification.isReadyForExecution()) {
      throw new BadRequestException(`Scheduled notification ${id} is not ready for execution`);
    }

    scheduledNotification.updateStatus('processing');
    scheduledNotification.updateLastExecutedAt(new Date());
    scheduledNotification.incrementExecutionCount();

    await this.schedulingRepository.update(id, scheduledNotification);

    try {
      // Simulate notification execution
      await this.performNotificationExecution(scheduledNotification);

      scheduledNotification.updateStatus('completed');
      scheduledNotification.incrementSuccessCount();

      this.logger.log(`Scheduled notification ${id} executed successfully`);
    } catch (error) {
      scheduledNotification.updateStatus('failed');
      scheduledNotification.incrementFailureCount();

      this.logger.error(`Scheduled notification ${id} execution failed: ${error.message}`);
      throw error;
    }

    return this.schedulingRepository.update(id, scheduledNotification);
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
    return this.schedulingRepository.getStatistics();
  }

  async cleanupExpiredNotifications(): Promise<number> {
    this.logger.log('Cleaning up expired scheduled notifications');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

    return this.schedulingRepository.cleanupExpired(cutoffDate);
  }

  private validateSchedulePattern(schedulePattern: any): void {
    const errors: string[] = [];

    if (!schedulePattern.type) {
      errors.push('Schedule type is required');
    }

    if (!schedulePattern.timezone) {
      errors.push('Timezone is required');
    }

    if (schedulePattern.type === 'cron') {
      if (!schedulePattern.cronExpression) {
        errors.push('Cron expression is required for cron type');
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

    if (errors.length > 0) {
      throw new BadRequestException(`Invalid schedule pattern: ${errors.join(', ')}`);
    }
  }

  private calculateNextExecution(schedulePattern: any): Date | null {
    try {
      const now = new Date();

      if (schedulePattern.type === 'once') {
        return schedulePattern.scheduledAt ? new Date(schedulePattern.scheduledAt) : null;
      }

      if (schedulePattern.type === 'cron') {
        if (!schedulePattern.cronExpression) return null;
        // For now, return 24 hours from now as a default
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      if (schedulePattern.type === 'recurring') {
        return this.calculateRecurringNextExecution(schedulePattern);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to calculate next execution: ${error.message}`);
      return null;
    }
  }

  private calculateRecurringNextExecution(schedulePattern: any): Date | null {
    try {
      const now = new Date();

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
      this.logger.error(`Failed to calculate recurring next execution: ${error.message}`);
      return null;
    }
  }

  private async performNotificationExecution(
    scheduledNotification: ScheduledNotification,
  ): Promise<void> {
    // Simulate notification execution
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Simulated notification execution failure');
    }
  }
}
