import { NotificationChannelVO } from '../value-objects/notification-channel.vo';

export class NotificationFailedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly channel: NotificationChannelVO,
    public readonly errorMessage: string,
    public readonly errorCode?: string,
    public readonly failedAt: Date = new Date(),
    public readonly retryCount: number = 0,
  ) {}

  static create(
    notificationId: string,
    userId: string,
    channel: NotificationChannelVO,
    errorMessage: string,
    errorCode?: string,
    retryCount: number = 0,
  ): NotificationFailedEvent {
    return new NotificationFailedEvent(
      notificationId,
      userId,
      channel,
      errorMessage,
      errorCode,
      new Date(),
      retryCount,
    );
  }
}
