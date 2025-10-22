import { NotificationStatus } from '../../../../../common/types/notification.types';

export class NotificationStatusVO {
  private readonly value: NotificationStatus;

  constructor(value: NotificationStatus) {
    this.value = value;
  }

  static fromString(value: string): NotificationStatusVO {
    return new NotificationStatusVO(value as NotificationStatus);
  }

  getValue(): NotificationStatus {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  canBeSent(): boolean {
    return this.value === NotificationStatus.PENDING;
  }

  isSent(): boolean {
    return this.value === NotificationStatus.SENT;
  }

  isDelivered(): boolean {
    return this.value === NotificationStatus.DELIVERED;
  }

  isRead(): boolean {
    return this.value === NotificationStatus.READ;
  }

  isFailed(): boolean {
    return this.value === NotificationStatus.FAILED;
  }

  isPending(): boolean {
    return this.value === NotificationStatus.PENDING;
  }

  isClicked(): boolean {
    return this.value === NotificationStatus.CLICKED;
  }
}
