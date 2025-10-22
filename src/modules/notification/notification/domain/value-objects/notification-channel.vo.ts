import { NotificationChannel } from '../../../../../common/types/notification.types';

export class NotificationChannelVO {
  private readonly value: NotificationChannel;

  constructor(value: NotificationChannel) {
    this.value = value;
  }

  static fromString(value: string): NotificationChannelVO {
    return new NotificationChannelVO(value as NotificationChannel);
  }

  static fromStrings(values: string[]): NotificationChannelVO[] {
    return values.map((value) => new NotificationChannelVO(value as NotificationChannel));
  }

  getValue(): NotificationChannel {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  isPush(): boolean {
    return this.value === NotificationChannel.PUSH;
  }

  isEmail(): boolean {
    return this.value === NotificationChannel.EMAIL;
  }

  isSms(): boolean {
    return this.value === NotificationChannel.SMS;
  }

  isInApp(): boolean {
    return this.value === NotificationChannel.IN_APP;
  }

  isWebhook(): boolean {
    return this.value === NotificationChannel.WEBHOOK;
  }

  requiresExternalService(): boolean {
    return (
      this.value === NotificationChannel.EMAIL ||
      this.value === NotificationChannel.SMS ||
      this.value === NotificationChannel.PUSH
    );
  }

  isRealTime(): boolean {
    return this.value === NotificationChannel.PUSH || this.value === NotificationChannel.IN_APP;
  }
}
