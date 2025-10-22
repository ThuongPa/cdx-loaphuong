import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BulkMarkReadCommand } from './bulk-mark-read.command';
import { NotificationCacheService } from '../../../../../infrastructure/cache/notification-cache.service';
import { Injectable, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { NotificationRepository } from '../../domain/notification.repository';

@Injectable()
@CommandHandler(BulkMarkReadCommand)
export class BulkMarkReadHandler implements ICommandHandler<BulkMarkReadCommand> {
  private readonly logger = new Logger(BulkMarkReadHandler.name);

  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
    private readonly cacheService: NotificationCacheService,
  ) {}

  async execute(command: BulkMarkReadCommand): Promise<{ updatedCount: number; readAt: Date }> {
    const { userId, ids } = command;
    const readAt = new Date();
    let updatedCount = 0;

    const notifications = await (this.notificationRepository as any).getUserNotifications(userId, {
      limit: 1000,
    });

    const idSet = new Set(ids);
    for (const n of notifications) {
      if (idSet.has(n.id) && !n.readAt) {
        if (n.userId !== userId) {
          throw new ForbiddenException('Access denied');
        }
        await (this.notificationRepository as any).updateUserNotificationStatus(n.id, 'read', {
          readAt,
        });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await this.cacheService.invalidateAllNotificationCaches(userId);
    }

    return { updatedCount, readAt };
  }
}
