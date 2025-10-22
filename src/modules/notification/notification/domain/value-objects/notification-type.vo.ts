import { NotificationType } from '../../../../../common/types/notification.types';

export class NotificationTypeVO {
  private readonly value: NotificationType;

  constructor(value: NotificationType) {
    this.value = value;
  }

  static fromString(value: string): NotificationTypeVO {
    return new NotificationTypeVO(value as NotificationType);
  }

  getValue(): NotificationType {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  isPayment(): boolean {
    return this.value === NotificationType.PAYMENT;
  }

  isOrder(): boolean {
    return this.value === NotificationType.ORDER;
  }

  isPromotion(): boolean {
    return this.value === NotificationType.PROMOTION;
  }

  isSystem(): boolean {
    return this.value === NotificationType.SYSTEM;
  }

  isSecurity(): boolean {
    return this.value === NotificationType.SECURITY;
  }

  isEmergency(): boolean {
    return this.value === NotificationType.EMERGENCY;
  }

  isBooking(): boolean {
    return this.value === NotificationType.BOOKING;
  }

  isAnnouncement(): boolean {
    return this.value === NotificationType.ANNOUNCEMENT;
  }
}
