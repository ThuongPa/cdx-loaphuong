import { UserNotification } from '../../src/infrastructure/database/schemas/user-notification.schema';
import { CuidUtil } from '../../src/common/utils/cuid.util';
import { DateUtil } from '../../src/common/utils/date.util';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../src/common/types/notification.types';
import { NotificationStatus } from '../../src/common/enums/notification-status.enum';

export class MockDataHelper {
  static createMockUserNotification(overrides: Partial<UserNotification> = {}): UserNotification {
    return {
      id: CuidUtil.generate(),
      _id: CuidUtil.generate(),
      userId: CuidUtil.generate(),
      notificationId: CuidUtil.generate(),
      title: 'Test Notification',
      body: 'This is a test notification',
      type: NotificationType.PAYMENT,
      channel: NotificationChannel.PUSH,
      priority: NotificationPriority.NORMAL,
      status: NotificationStatus.PENDING,
      data: { amount: 100 },
      sentAt: undefined,
      deliveredAt: undefined,
      readAt: undefined,
      errorMessage: undefined,
      errorCode: undefined,
      retryCount: 0,
      deliveryId: undefined,
      createdAt: DateUtil.now(),
      updatedAt: DateUtil.now(),
      ...overrides,
    };
  }

  static createMockUnreadNotifications(): UserNotification[] {
    return [
      this.createMockUserNotification({
        id: 'notif-1',
        title: 'Payment Received',
        body: 'You received a payment of $100',
        type: NotificationType.PAYMENT,
        status: NotificationStatus.DELIVERED,
        readAt: undefined,
      }),
      this.createMockUserNotification({
        id: 'notif-2',
        title: 'Booking Confirmed',
        body: 'Your booking has been confirmed',
        type: NotificationType.BOOKING,
        status: NotificationStatus.DELIVERED,
        readAt: undefined,
      }),
    ];
  }

  static createMockReadNotifications(): UserNotification[] {
    return [
      this.createMockUserNotification({
        id: 'notif-3',
        title: 'Payment Received',
        body: 'You received a payment of $50',
        type: NotificationType.PAYMENT,
        status: NotificationStatus.READ,
        readAt: DateUtil.now(),
      }),
    ];
  }

  static createMockMixedNotifications(): UserNotification[] {
    return [...this.createMockUnreadNotifications(), ...this.createMockReadNotifications()];
  }

  static createMockAllReadNotifications(): UserNotification[] {
    return [
      this.createMockUserNotification({
        id: 'notif-1',
        title: 'Payment Received',
        body: 'You received a payment of $100',
        type: NotificationType.PAYMENT,
        status: NotificationStatus.READ,
        readAt: DateUtil.now(),
      }),
      this.createMockUserNotification({
        id: 'notif-2',
        title: 'Booking Confirmed',
        body: 'Your booking has been confirmed',
        type: NotificationType.BOOKING,
        status: NotificationStatus.READ,
        readAt: DateUtil.now(),
      }),
    ];
  }

  static createMockAlreadyReadNotification(): UserNotification {
    return this.createMockUserNotification({
      id: 'notif-1',
      title: 'Payment Received',
      body: 'You received a payment of $100',
      type: NotificationType.PAYMENT,
      status: NotificationStatus.READ,
      readAt: DateUtil.now(),
    });
  }

  static createMockUserNotifications(
    count: number,
    overrides: Partial<UserNotification>[] = [],
  ): UserNotification[] {
    return Array.from({ length: count }, (_, index) =>
      this.createMockUserNotification(overrides[index] || {}),
    );
  }
}
