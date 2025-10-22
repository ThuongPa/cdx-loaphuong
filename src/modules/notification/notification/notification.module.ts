import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { NotificationCacheService } from '../../../infrastructure/cache/notification-cache.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { GetNotificationHistoryHandler } from './application/queries/get-notification-history.handler';
import { GetNotificationHandler } from './application/queries/get-notification.handler';
import { GetUnreadCountHandler } from './application/queries/get-unread-count.handler';
import { GetUserStatisticsHandler } from './application/queries/get-user-statistics.handler';
import { MarkAsReadHandler } from './application/commands/mark-as-read.handler';
import { MarkAllAsReadHandler } from './application/commands/mark-all-read.handler';
import { BulkMarkReadHandler } from './application/commands/bulk-mark-read.handler';
import { BulkArchiveHandler } from './application/commands/bulk-archive.handler';
import { NotificationController } from './interface/notification.controller';
import { TemplatesModule } from '../templates/templates.module';

// Schemas
import {
  Notification,
  NotificationSchema,
} from '../../../infrastructure/database/schemas/notification.schema';
import {
  UserNotification,
  UserNotificationSchema,
} from '../../../infrastructure/database/schemas/user-notification.schema';

// Infrastructure
import { NotificationRepositoryImpl } from './infrastructure/notification.repository.impl';

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    TemplatesModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: UserNotification.name, schema: UserNotificationSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    // Infrastructure Services
    RedisService,
    NotificationCacheService,

    // Repository
    {
      provide: 'NotificationRepository',
      useClass: NotificationRepositoryImpl,
    },
    NotificationRepositoryImpl,

    // Query Handlers
    GetNotificationHistoryHandler,
    GetNotificationHandler,
    GetUnreadCountHandler,
    GetUserStatisticsHandler,

    // Command Handlers
    MarkAsReadHandler,
    MarkAllAsReadHandler,
    BulkMarkReadHandler,
    BulkArchiveHandler,
  ],
  exports: [
    RedisService,
    NotificationCacheService,
    'NotificationRepository',
    NotificationRepositoryImpl,
    GetNotificationHistoryHandler,
    GetNotificationHandler,
    GetUnreadCountHandler,
    GetUserStatisticsHandler,
    MarkAsReadHandler,
    MarkAllAsReadHandler,
    BulkMarkReadHandler,
    BulkArchiveHandler,
  ],
})
export class NotificationModule {}
