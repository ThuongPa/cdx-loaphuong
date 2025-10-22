import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../../../common/types/notification.types';

export interface ChannelPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  webhook: boolean;
}

export interface TypePreferences {
  payment: boolean;
  order: boolean;
  promotion: boolean;
  system: boolean;
  security: boolean;
  emergency: boolean;
  booking: boolean;
  announcement: boolean;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
  days: number[]; // 0-6 (Sunday-Saturday)
}

export class UserPreferences {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly channelPreferences: ChannelPreferences,
    public readonly typePreferences: TypePreferences,
    public readonly quietHours: QuietHours,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static createDefault(userId: string): UserPreferences {
    return new UserPreferences(
      `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      {
        email: true,
        sms: true,
        push: true,
        inApp: true,
        webhook: false,
      },
      {
        payment: true,
        order: true,
        promotion: true,
        system: true,
        security: true,
        emergency: true, // Always enabled
        booking: true,
        announcement: true,
      },
      {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
        days: [0, 1, 2, 3, 4, 5, 6],
      },
      new Date(),
      new Date(),
    );
  }

  shouldSendNotification(
    type: NotificationType,
    channel: NotificationChannel,
    priority: NotificationPriority,
  ): boolean {
    // Emergency notifications always go through
    if (priority === NotificationPriority.URGENT || type === NotificationType.EMERGENCY) {
      return true;
    }

    // Check if user has enabled this type and channel
    const typeKey = this.getTypeKey(type);
    const channelKey = this.getChannelKey(channel);

    return this.typePreferences[typeKey] && this.channelPreferences[channelKey];
  }

  isChannelEnabled(channel: NotificationChannel): boolean {
    const channelKey = this.getChannelKey(channel);
    return this.channelPreferences[channelKey];
  }

  isTypeEnabled(type: NotificationType): boolean {
    const typeKey = this.getTypeKey(type);
    return this.typePreferences[typeKey];
  }

  updateChannelPreferences(channels: Partial<ChannelPreferences>): UserPreferences {
    return new UserPreferences(
      this.id,
      this.userId,
      { ...this.channelPreferences, ...channels },
      this.typePreferences,
      this.quietHours,
      this.createdAt,
      new Date(),
    );
  }

  updateTypePreferences(types: Partial<TypePreferences>): UserPreferences {
    // Ensure emergency is always enabled
    const updatedTypes = { ...this.typePreferences, ...types };
    updatedTypes.emergency = true;

    return new UserPreferences(
      this.id,
      this.userId,
      this.channelPreferences,
      updatedTypes,
      this.quietHours,
      this.createdAt,
      new Date(),
    );
  }

  updateQuietHours(quietHours: Partial<QuietHours>): UserPreferences {
    return new UserPreferences(
      this.id,
      this.userId,
      this.channelPreferences,
      this.typePreferences,
      { ...this.quietHours, ...quietHours },
      this.createdAt,
      new Date(),
    );
  }

  private getTypeKey(type: NotificationType): keyof TypePreferences {
    const typeMap: Record<NotificationType, keyof TypePreferences> = {
      [NotificationType.PAYMENT]: 'payment',
      [NotificationType.ORDER]: 'order',
      [NotificationType.PROMOTION]: 'promotion',
      [NotificationType.SYSTEM]: 'system',
      [NotificationType.SECURITY]: 'security',
      [NotificationType.EMERGENCY]: 'emergency',
      [NotificationType.BOOKING]: 'booking',
      [NotificationType.ANNOUNCEMENT]: 'announcement',
    };
    return typeMap[type] || 'system';
  }

  private getChannelKey(channel: NotificationChannel): keyof ChannelPreferences {
    const channelMap: Record<NotificationChannel, keyof ChannelPreferences> = {
      [NotificationChannel.EMAIL]: 'email',
      [NotificationChannel.SMS]: 'sms',
      [NotificationChannel.PUSH]: 'push',
      [NotificationChannel.IN_APP]: 'inApp',
      [NotificationChannel.WEBHOOK]: 'webhook',
    };
    return channelMap[channel] || 'email';
  }
}
