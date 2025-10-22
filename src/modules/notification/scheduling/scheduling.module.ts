import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulingService } from './application/services/scheduling.service';
import { SchedulingRepository } from './infrastructure/scheduling.repository';
import { SchedulingRepositoryImpl } from './infrastructure/scheduling.repository.impl';
import {
  ScheduledNotification,
  ScheduledNotificationSchema,
} from './scheduled-notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScheduledNotification.name, schema: ScheduledNotificationSchema },
    ]),
  ],
  providers: [
    SchedulingService,
    {
      provide: 'SchedulingRepository',
      useClass: SchedulingRepositoryImpl,
    },
  ],
  exports: [SchedulingService],
})
export class SchedulingModule {}
