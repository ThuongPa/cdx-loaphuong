import { NotificationCacheService } from '../../../../../infrastructure/cache/notification-cache.service';
import { MarkAllAsReadCommand, MarkAllAsReadResult } from './mark-all-read.command';
import { Injectable, Get, Res, Logger, Inject } from '@nestjs/common';
import { ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { NotificationRepositoryImpl } from '../../infrastructure/notification.repository.impl';

@Injectable()
@CommandHandler(MarkAllAsReadCommand)
export class MarkAllAsReadHandler implements ICommandHandler<MarkAllAsReadCommand> {
  private readonly logger = new Logger(MarkAllAsReadHandler.name);

  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepositoryImpl,
    private readonly cacheService: NotificationCacheService,
  ) {}

  async execute(command: MarkAllAsReadCommand): Promise<MarkAllAsReadResult> {
    try {
      this.logger.log(`Marking all notifications as read for user: ${command.userId}`);

      // Get all unread notifications for the user
      const unreadNotifications = await this.notificationRepository.getUserNotifications(
        command.userId,
        { status: 'delivered', limit: 1000 }, // Assuming 'delivered' status means unread
      );

      if (unreadNotifications.length === 0) {
        this.logger.log(`No unread notifications found for user: ${command.userId}`);
        return {
          success: true,
          updatedCount: 0,
          readAt: new Date(),
        };
      }

      // Mark all unread notifications as read
      const readAt = new Date();
      let updatedCount = 0;

      for (const notification of unreadNotifications) {
        if (!notification.readAt) {
          await this.notificationRepository.updateUserNotificationStatus(notification.id, 'read', {
            readAt,
          });
          updatedCount++;
        }
      }

      const result: MarkAllAsReadResult = {
        success: true,
        updatedCount,
        readAt,
      };

      this.logger.log(
        `Successfully marked ${updatedCount} notifications as read for user: ${command.userId}`,
      );

      // Invalidate cache only if notifications were actually updated
      if (updatedCount > 0) {
        await this.cacheService.invalidateAllNotificationCaches(command.userId);
      }

      // TODO: Emit bulk NotificationRead domain events
      // This will be implemented when we add event handling

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to mark all notifications as read for user ${command.userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
