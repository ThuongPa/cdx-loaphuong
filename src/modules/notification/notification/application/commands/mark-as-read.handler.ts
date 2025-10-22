import { NotificationCacheService } from '../../../../../infrastructure/cache/notification-cache.service';
import {
  NotFoundException,
  BadRequestException,
  Injectable,
  ForbiddenException,
  Get,
  Res,
  Logger,
  Inject,
} from '@nestjs/common';
import { ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { MarkAsReadCommand, MarkAsReadResult } from './mark-as-read.command';
import { NotificationRepositoryImpl } from '../../infrastructure/notification.repository.impl';

@Injectable()
@CommandHandler(MarkAsReadCommand)
export class MarkAsReadHandler implements ICommandHandler<MarkAsReadCommand> {
  private readonly logger = new Logger(MarkAsReadHandler.name);

  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepositoryImpl,
    private readonly cacheService: NotificationCacheService,
  ) {}

  async execute(command: MarkAsReadCommand): Promise<MarkAsReadResult> {
    try {
      this.logger.log(
        `Marking notification as read: ${command.notificationId} for user: ${command.userId}`,
      );

      // Get user notifications to find the specific one
      const userNotifications = await this.notificationRepository.getUserNotifications(
        command.userId,
        { limit: 1000 }, // Get more to find the specific notification
      );

      const notification = userNotifications.find((n) => n.id === command.notificationId);

      if (!notification) {
        this.logger.warn(
          `Notification not found: ${command.notificationId} for user: ${command.userId}`,
        );
        throw new NotFoundException('Notification not found');
      }

      // Security check: User can only mark their own notifications as read
      if (notification.userId !== command.userId) {
        this.logger.warn(
          `User ${command.userId} attempted to mark notification ${command.notificationId} as read, but it belongs to user ${notification.userId}`,
        );
        throw new ForbiddenException('Access denied');
      }

      // Check if already read
      if (notification.readAt) {
        this.logger.log(`Notification ${command.notificationId} is already read`);
        return {
          success: true,
          notificationId: command.notificationId,
          readAt: notification.readAt,
        };
      }

      // Update notification status to read
      const readAt = new Date();
      await this.notificationRepository.updateUserNotificationStatus(
        command.notificationId,
        'read',
        { readAt },
      );

      const result: MarkAsReadResult = {
        success: true,
        notificationId: command.notificationId,
        readAt,
      };

      this.logger.log(
        `Successfully marked notification as read: ${command.notificationId} for user: ${command.userId}`,
      );

      // Invalidate cache
      await this.cacheService.invalidateAllNotificationCaches(command.userId);

      // TODO: Emit NotificationRead domain event
      // This will be implemented when we add event handling

      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Failed to mark notification as read ${command.notificationId} for user ${command.userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
