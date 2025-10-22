import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { RetryWorkerService } from './retry-worker';
import { NovuModule } from '../infrastructure/external/novu/novu.module';
import { CircuitBreakerModule } from '../infrastructure/external/circuit-breaker/circuit-breaker.module';
import { ErrorClassifierService } from '../common/services/error-classifier.service';
import { DLQModule } from '../modules/notification/integration/dlq/dlq.module';
import { TokenCleanupService } from '../modules/notification/domain/services/token-cleanup.service';
import {
  UserNotification,
  UserNotificationSchema,
} from '../infrastructure/database/schemas/user-notification.schema';
import {
  DeviceToken,
  DeviceTokenSchema,
} from '../infrastructure/database/schemas/device-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserNotification.name, schema: UserNotificationSchema },
      { name: DeviceToken.name, schema: DeviceTokenSchema },
    ]),
    ScheduleModule,
    NovuModule,
    CircuitBreakerModule,
    DLQModule,
  ],
  providers: [RetryWorkerService, ErrorClassifierService, TokenCleanupService],
  exports: [RetryWorkerService, ErrorClassifierService, TokenCleanupService],
})
export class WorkersModule {}
