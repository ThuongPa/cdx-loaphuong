import { GetNotificationQuery, NotificationDetail } from './get-notification.query';
import {
  NotFoundException,
  BadRequestException,
  Injectable,
  ForbiddenException,
  Get,
  Query,
  Logger,
  Inject,
} from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotificationRepositoryImpl } from '../../infrastructure/notification.repository.impl';

@Injectable()
@QueryHandler(GetNotificationQuery)
export class GetNotificationHandler implements IQueryHandler<GetNotificationQuery> {
  private readonly logger = new Logger(GetNotificationHandler.name);

  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepositoryImpl,
  ) {}

  async execute(query: GetNotificationQuery): Promise<NotificationDetail> {
    try {
      this.logger.log(
        `Getting notification detail: ${query.notificationId} for user: ${query.userId}`,
      );

      // Get user notifications to find the specific one
      const userNotifications = await this.notificationRepository.getUserNotifications(
        query.userId,
        { limit: 1000 }, // Get more to find the specific notification
      );

      const notification = userNotifications.find((n) => n.id === query.notificationId);

      if (!notification) {
        this.logger.warn(
          `Notification not found: ${query.notificationId} for user: ${query.userId}`,
        );
        throw new NotFoundException('Notification not found');
      }

      // Security check: User can only view their own notifications
      if (notification.userId !== query.userId) {
        this.logger.warn(
          `User ${query.userId} attempted to access notification ${query.notificationId} belonging to user ${notification.userId}`,
        );
        throw new ForbiddenException('Access denied');
      }

      const result: NotificationDetail = {
        id: notification.id,
        userId: notification.userId,
        notificationId: notification.notificationId,
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
        errorMessage: notification.errorMessage,
        errorCode: notification.errorCode,
        retryCount: notification.retryCount,
        deliveryId: notification.deliveryId,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      };

      this.logger.log(
        `Retrieved notification detail: ${query.notificationId} for user: ${query.userId}`,
      );

      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Failed to get notification detail ${query.notificationId} for user ${query.userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
