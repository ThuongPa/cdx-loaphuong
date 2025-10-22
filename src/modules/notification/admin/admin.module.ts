import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminController } from './interface/admin.controller';
import { AdminStatisticsService } from './application/services/admin-statistics.service';
import { BroadcastNotificationService } from './application/services/broadcast-notification.service';
import { FailedNotificationService } from './application/services/failed-notification.service';
import { ManualRetryService } from './application/services/manual-retry.service';
import { ScheduledNotificationService } from './application/services/scheduled-notification.service';
import { User, UserSchema } from '../../../infrastructure/database/schemas/user.schema';
import { RedisModule } from '../../../infrastructure/cache/redis.module';
import { AuthServiceModule } from '../../../infrastructure/external/auth-service/auth-service.module';
import { CircuitBreakerModule } from '../../../infrastructure/external/circuit-breaker/circuit-breaker.module';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard';
import {
  Announcement,
  AnnouncementSchema,
} from '../../../infrastructure/database/schemas/announcement.schema';
import {
  UserNotification,
  UserNotificationSchema,
} from '../../../infrastructure/database/schemas/user-notification.schema';
import {
  AuditLog,
  AuditLogSchema,
} from '../../../infrastructure/database/schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: UserNotification.name, schema: UserNotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    RedisModule,
    ScheduleModule,
    AuthServiceModule,
    CircuitBreakerModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminStatisticsService,
    BroadcastNotificationService,
    FailedNotificationService,
    ManualRetryService,
    ScheduledNotificationService,
    AuditLogService,
    RateLimitGuard,
  ],
  exports: [
    AdminStatisticsService,
    BroadcastNotificationService,
    FailedNotificationService,
    ManualRetryService,
    ScheduledNotificationService,
  ],
})
export class AdminModule {}
