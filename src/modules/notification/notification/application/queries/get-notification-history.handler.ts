import { NotificationCacheService } from '../../../../../infrastructure/cache/notification-cache.service';
import { Injectable, Get, Query, Res, Logger, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotificationRepositoryImpl } from '../../infrastructure/notification.repository.impl';
import {
  GetNotificationHistoryQuery,
  NotificationHistoryItem,
  NotificationHistoryResult,
} from './get-notification-history.query';

@Injectable()
@QueryHandler(GetNotificationHistoryQuery)
export class GetNotificationHistoryHandler implements IQueryHandler<GetNotificationHistoryQuery> {
  private readonly logger = new Logger(GetNotificationHistoryHandler.name);

  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepositoryImpl,
    private readonly cacheService: NotificationCacheService,
  ) {}

  async execute(query: GetNotificationHistoryQuery): Promise<NotificationHistoryResult> {
    try {
      this.logger.log(`Getting notification history for user: ${query.userId}`);

      // Validate pagination parameters
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 20)); // Max 100 per page
      const offset = (page - 1) * limit;

      // Check cache first
      const cacheFilters = {
        type: query.type,
        channel: query.channel,
        status: query.status,
        startDate: query.startDate?.toISOString(),
        endDate: query.endDate?.toISOString(),
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      const cached = await this.cacheService.getCachedNotificationHistory(
        query.userId,
        page,
        limit,
        cacheFilters,
      );

      if (cached) {
        this.logger.log(`Returning cached notification history for user: ${query.userId}`);
        return {
          notifications: cached.notifications,
          pagination: cached.pagination,
        };
      }

      // Build filter options
      const filterOptions: any = {
        status: query.status,
        channel: query.channel,
        type: query.type,
        limit,
        offset,
        startDate: query.startDate,
        endDate: query.endDate,
      };

      // Get notifications from repository
      const userNotifications = await this.notificationRepository.getUserNotifications(
        query.userId,
        filterOptions,
      );

      // Notifications are already filtered by repository
      const filteredNotifications = userNotifications;

      // Apply sorting
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'desc';

      filteredNotifications.sort((a, b) => {
        const aValue = new Date(a[sortBy] || a.createdAt).getTime();
        const bValue = new Date(b[sortBy] || b.createdAt).getTime();

        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });

      // Apply pagination to filtered results
      const total = filteredNotifications.length;
      const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

      // Transform to response format
      const notifications: NotificationHistoryItem[] = paginatedNotifications.map(
        (notification) => ({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          channel: notification.channel,
          priority: notification.priority,
          status: notification.status,
          data: notification.data || {},
          sentAt: notification.sentAt,
          deliveredAt: notification.deliveredAt,
          readAt: notification.readAt,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
        }),
      );

      const totalPages = Math.ceil(total / limit);

      const result: NotificationHistoryResult = {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      this.logger.log(
        `Retrieved ${notifications.length} notifications for user ${query.userId} (page ${page}/${totalPages})`,
      );

      // Cache the result
      await this.cacheService.cacheNotificationHistory(query.userId, page, limit, cacheFilters, {
        notifications: result.notifications,
        pagination: result.pagination,
        cachedAt: new Date(),
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get notification history for user ${query.userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
