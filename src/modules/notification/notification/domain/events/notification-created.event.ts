import { NotificationTypeVO } from '../value-objects/notification-type.vo';
import { NotificationPriorityVO } from '../value-objects/notification-priority.vo';
import { NotificationChannelVO } from '../value-objects/notification-channel.vo';

export class NotificationCreatedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly title: string,
    public readonly body: string,
    public readonly type: NotificationTypeVO,
    public readonly priority: NotificationPriorityVO,
    public readonly channels: NotificationChannelVO[],
    public readonly targetRoles: string[],
    public readonly targetUsers: string[],
    public readonly data: Record<string, any>,
    public readonly createdAt: Date,
  ) {}

  static create(
    notificationId: string,
    title: string,
    body: string,
    type: NotificationTypeVO,
    priority: NotificationPriorityVO,
    channels: NotificationChannelVO[],
    targetRoles: string[],
    targetUsers: string[],
    data: Record<string, any>,
  ): NotificationCreatedEvent {
    return new NotificationCreatedEvent(
      notificationId,
      title,
      body,
      type,
      priority,
      channels,
      targetRoles,
      targetUsers,
      data,
      new Date(),
    );
  }
}
