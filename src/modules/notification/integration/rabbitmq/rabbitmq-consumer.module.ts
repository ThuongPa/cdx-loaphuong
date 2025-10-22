import { Module, Res } from '@nestjs/common';
import { RabbitMQModule } from '../../../../infrastructure/messaging/rabbitmq.module';
import { NotificationEventConsumer } from './notification-event.consumer';
import {
  FeedbackCreatedEventHandler,
  FeedbackSubmittedEventHandler,
  StatusChangedEventHandler,
  FeedbackAssignedEventHandler,
  AssignmentCreatedEventHandler,
  CommentAddedEventHandler,
  SLABreachedEventHandler,
  SLAWarningEventHandler,
  FeedbackResolvedEventHandler,
  FeedbackClosedEventHandler,
} from './event-handlers/feedback-event.handler';
import {
  UserRoleChangedEventHandler,
  UserUpdatedEventHandler,
  UserCreatedEventHandler,
  UserDeletedEventHandler,
} from './event-handlers/auth-event.handler';
import { UserModule } from '../../user/user.module';
import { NovuSubscriberQueueService } from '../../../../infrastructure/external/novu/novu-subscriber-queue.service';
import { NovuModule } from '../../../../infrastructure/external/novu/novu.module';
import { RedisModule } from '../../../../infrastructure/cache/redis.module';

@Module({
  imports: [RabbitMQModule, UserModule, NovuModule, RedisModule],
  providers: [
    NotificationEventConsumer,
    // Feedback event handlers
    FeedbackCreatedEventHandler,
    FeedbackSubmittedEventHandler,
    StatusChangedEventHandler,
    FeedbackAssignedEventHandler,
    AssignmentCreatedEventHandler,
    CommentAddedEventHandler,
    SLABreachedEventHandler,
    SLAWarningEventHandler,
    FeedbackResolvedEventHandler,
    FeedbackClosedEventHandler,
    // Auth event handlers
    UserRoleChangedEventHandler,
    UserUpdatedEventHandler,
    UserCreatedEventHandler,
    UserDeletedEventHandler,
    // Novu subscriber queue service
    NovuSubscriberQueueService,
  ],
  exports: [NotificationEventConsumer],
})
export class RabbitMQConsumerModule {}
