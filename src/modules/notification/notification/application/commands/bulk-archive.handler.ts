import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BulkArchiveCommand } from './bulk-archive.command';
import { NotificationCacheService } from '../../../../../infrastructure/cache/notification-cache.service';
import { Injectable, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { NotificationRepository } from '../../domain/notification.repository';

@Injectable()
@CommandHandler(BulkArchiveCommand)
export class BulkArchiveHandler implements ICommandHandler<BulkArchiveCommand> {
  private readonly logger = new Logger(BulkArchiveHandler.name);

  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
    private readonly cacheService: NotificationCacheService,
  ) {}

  async execute(command: BulkArchiveCommand): Promise<{ updatedCount: number }> {
    const { userId, ids } = command;
    let updatedCount = 0;

    const notifications = await (this.notificationRepository as any).getUserNotifications(userId, {
      limit: 1000,
    });

    const idSet = new Set(ids);
    for (const n of notifications) {
      if (idSet.has(n.id) && !(n as any).archived) {
        if (n.userId !== userId) {
          throw new ForbiddenException('Access denied');
        }
        await (this.notificationRepository as any).updateUserNotificationStatus(n.id, n.status, {
          // keep status, just mark archived
        });
        await (this.notificationRepository as any)['userNotificationModel']
          .updateOne({ id: n.id }, { $set: { archived: true, updatedAt: new Date() } })
          .exec();
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await this.cacheService.invalidateAllNotificationCaches(userId);
    }

    return { updatedCount };
  }
}
