import { Module, Controller } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DLQService } from './dlq.service';
import { DLQController } from './dlq.controller';
import {
  UserNotification,
  UserNotificationSchema,
} from '../../../../infrastructure/database/schemas/user-notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserNotification.name, schema: UserNotificationSchema }]),
  ],
  providers: [DLQService],
  controllers: [DLQController],
  exports: [DLQService],
})
export class DLQModule {}
