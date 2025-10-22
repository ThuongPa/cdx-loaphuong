import { NotificationPriority } from '../../../../../common/types/notification.types';

export class NotificationPriorityVO {
  private readonly value: NotificationPriority;

  constructor(value: NotificationPriority) {
    this.value = value;
  }

  static fromString(value: string): NotificationPriorityVO {
    return new NotificationPriorityVO(value as NotificationPriority);
  }

  getValue(): NotificationPriority {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  canBypassPreferences(): boolean {
    return this.value === NotificationPriority.URGENT;
  }

  respectCriticalPreferencesOnly(): boolean {
    return this.value === NotificationPriority.HIGH;
  }

  getNumericPriority(): number {
    switch (this.value) {
      case NotificationPriority.URGENT:
        return 1;
      case NotificationPriority.HIGH:
        return 2;
      case NotificationPriority.NORMAL:
        return 3;
      case NotificationPriority.LOW:
        return 4;
      default:
        return 3;
    }
  }

  isHighPriority(): boolean {
    return this.value === NotificationPriority.URGENT || this.value === NotificationPriority.HIGH;
  }

  isLowPriority(): boolean {
    return this.value === NotificationPriority.LOW;
  }

  isUrgent(): boolean {
    return this.value === NotificationPriority.URGENT;
  }

  isNormal(): boolean {
    return this.value === NotificationPriority.NORMAL;
  }
}
