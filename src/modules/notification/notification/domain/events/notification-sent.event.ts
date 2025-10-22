import { NotificationChannelVO } from '../value-objects/notification-channel.vo';

export class NotificationSentEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly channel: NotificationChannelVO,
    public readonly sentAt: Date,
    public readonly deliveryId?: string,
  ) {}

  static create(
    notificationId: string,
    userId: string,
    channel: NotificationChannelVO,
    deliveryId?: string,
  ): NotificationSentEvent {
    return new NotificationSentEvent(notificationId, userId, channel, new Date(), deliveryId);
  }
}
