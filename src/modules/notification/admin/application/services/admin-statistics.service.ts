import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../../../infrastructure/database/schemas/user-notification.schema';
import {
  Announcement,
  AnnouncementDocument,
} from '../../../../../infrastructure/database/schemas/announcement.schema';
import { RedisService } from '../../../../../infrastructure/cache/redis.service';
import {
  NotificationStatisticsResponseDto,
  NotificationStatisticsQueryDto,
  NotificationStatisticsDataDto,
  StatisticsPeriod,
} from '../../interface/dto/notification-statistics.dto';

@Injectable()
export class AdminStatisticsService {
  private readonly logger = new Logger(AdminStatisticsService.name);

  constructor(
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotificationDocument>,
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,
    private readonly redisService: RedisService,
  ) {}

  async getNotificationStatistics(
    query: NotificationStatisticsQueryDto,
  ): Promise<NotificationStatisticsResponseDto> {
    this.logger.log('Getting notification statistics', { query });

    try {
      // Check cache first
      const cacheKey = `admin:statistics:${JSON.stringify(query)}`;
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.log('Returning cached statistics');
        return JSON.parse(cached);
      }

      // Calculate date range
      const { startDate, endDate } = this.calculateDateRange(query);

      // Get statistics data
      const statistics = await this.calculateStatistics(startDate, endDate);

      // Cache the result for 5 minutes
      await this.redisService.set(cacheKey, JSON.stringify(statistics), 300);

      return {
        success: true,
        data: statistics,
        message: 'Statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error getting notification statistics', error);
      throw error;
    }
  }

  private calculateDateRange(query: NotificationStatisticsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (query.period) {
      case StatisticsPeriod.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case StatisticsPeriod.THIS_WEEK:
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        break;
      case StatisticsPeriod.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case StatisticsPeriod.CUSTOM:
        startDate = query.startDate ? new Date(query.startDate) : new Date();
        endDate = query.endDate ? new Date(query.endDate) : now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return { startDate, endDate };
  }

  private async calculateStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<NotificationStatisticsDataDto> {
    // Get total notifications
    const totalSent = await this.userNotificationModel.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Get today's notifications
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySent = await this.userNotificationModel.countDocuments({
      createdAt: { $gte: todayStart },
    });

    // Get this week's notifications
    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const thisWeekSent = await this.userNotificationModel.countDocuments({
      createdAt: { $gte: weekStart },
    });

    // Get this month's notifications
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const thisMonthSent = await this.userNotificationModel.countDocuments({
      createdAt: { $gte: monthStart },
    });

    // Get breakdown by channel
    const byChannel = await this.userNotificationModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$channel',
          count: { $sum: 1 },
        },
      },
    ]);

    const channelBreakdown = {
      push: 0,
      email: 0,
      inApp: 0,
    };

    byChannel.forEach((item) => {
      if (item._id in channelBreakdown) {
        channelBreakdown[item._id as keyof typeof channelBreakdown] = item.count;
      }
    });

    // Get breakdown by status
    const byStatus = await this.userNotificationModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusBreakdown = {
      sent: 0,
      failed: 0,
      pending: 0,
    };

    byStatus.forEach((item) => {
      if (item._id in statusBreakdown) {
        statusBreakdown[item._id as keyof typeof statusBreakdown] = item.count;
      }
    });

    // Calculate delivery rate
    const totalAttempts = statusBreakdown.sent + statusBreakdown.failed;
    const deliveryRate = totalAttempts > 0 ? (statusBreakdown.sent / totalAttempts) * 100 : 0;

    // Get top notification types
    const topTypes = await this.userNotificationModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    // Get failure reasons
    const failureReasons = await this.userNotificationModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'failed',
        },
      },
      {
        $group: {
          _id: '$errorCode',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    return {
      totalSent,
      todaySent,
      thisWeekSent,
      thisMonthSent,
      byChannel: channelBreakdown,
      byStatus: statusBreakdown,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      topTypes: topTypes.map((item) => ({
        type: item._id,
        count: item.count,
      })),
      failureReasons: failureReasons.map((item) => ({
        reason: item._id,
        count: item.count,
      })),
    };
  }
}
