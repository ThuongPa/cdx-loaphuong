import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RetryMetricsService } from './retry-metrics.service';
import { CircuitBreakerModule } from '../../../../infrastructure/external/circuit-breaker/circuit-breaker.module';
import { ErrorClassifierService } from '../../../../common/services/error-classifier.service';
import {
  UserNotification,
  UserNotificationSchema,
} from '../../../../infrastructure/database/schemas/user-notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserNotification.name, schema: UserNotificationSchema }]),
    CircuitBreakerModule,
  ],
  providers: [RetryMetricsService, ErrorClassifierService],
  exports: [RetryMetricsService],
})
export class AnalyticsModule {}
