import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../../../infrastructure/database/schemas/user-notification.schema';
import { User, UserDocument } from '../../../../../infrastructure/database/schemas/user.schema';
import {
  FailedNotificationResponseDto,
  FailedNotificationQueryDto,
  FailedNotificationItemDto,
} from '../../interface/dto/failed-notification.dto';

@Injectable()
export class FailedNotificationService {
  private readonly logger = new Logger(FailedNotificationService.name);

  constructor(
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getFailedNotifications(
    query: FailedNotificationQueryDto,
  ): Promise<FailedNotificationResponseDto> {
    this.logger.log('Getting failed notifications', { query });

    try {
      const { page = 1, limit = 20, startDate, endDate, errorType, notificationType } = query;
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {
        status: 'failed',
      };

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      if (errorType) {
        filter.errorCode = errorType;
      }

      if (notificationType) {
        filter.type = notificationType;
      }

      // Get failed notifications with user info
      const failedNotifications = await this.userNotificationModel
        .find(filter)
        .populate('userId', 'email', this.userModel)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Get total count
      const total = await this.userNotificationModel.countDocuments(filter);

      // Transform data
      const data: FailedNotificationItemDto[] = failedNotifications.map((notification) => ({
        id: notification._id.toString(),
        userId: notification.userId.toString(),
        userEmail: (notification.userId as any)?.email || 'Unknown',
        title: notification.title,
        type: notification.type,
        channel: notification.channel,
        errorMessage: notification.errorMessage || 'Unknown error',
        errorCode: notification.errorCode || 'UNKNOWN',
        retryCount: notification.retryCount || 0,
        createdAt: notification.createdAt,
        lastAttemptAt: notification.updatedAt,
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        message: 'Failed notifications retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error getting failed notifications', error);
      throw error;
    }
  }

  async exportToCsv(query: FailedNotificationQueryDto): Promise<string> {
    this.logger.log('Exporting failed notifications to CSV', { query });

    try {
      const { startDate, endDate, errorType, notificationType } = query;

      // Build filter
      const filter: any = {
        status: 'failed',
      };

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      if (errorType) {
        filter.errorCode = errorType;
      }

      if (notificationType) {
        filter.type = notificationType;
      }

      // Get all failed notifications for export
      const failedNotifications = await this.userNotificationModel
        .find(filter)
        .populate('userId', 'email', this.userModel)
        .sort({ createdAt: -1 })
        .lean();

      // Create CSV header
      const csvHeader = [
        'ID',
        'User ID',
        'User Email',
        'Title',
        'Type',
        'Channel',
        'Error Message',
        'Error Code',
        'Retry Count',
        'Created At',
        'Last Attempt At',
      ].join(',');

      // Create CSV rows
      const csvRows = failedNotifications.map((notification) => [
        notification._id.toString(),
        notification.userId.toString(),
        (notification.userId as any)?.email || 'Unknown',
        `"${notification.title}"`,
        notification.type,
        notification.channel,
        `"${notification.errorMessage || 'Unknown error'}"`,
        notification.errorCode || 'UNKNOWN',
        notification.retryCount || 0,
        notification.createdAt.toISOString(),
        notification.updatedAt.toISOString(),
      ]);

      // Combine header and rows
      const csvContent = [csvHeader, ...csvRows.map((row) => row.join(','))].join('\n');

      return csvContent;
    } catch (error) {
      this.logger.error('Error exporting failed notifications to CSV', error);
      throw error;
    }
  }
}
