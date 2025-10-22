import { createId } from '@paralleldrive/cuid2';
import { DevicePlatformVO } from './value-objects/device-platform.vo';
import { PushProviderVO } from './value-objects/push-provider.vo';
import { Get } from '@nestjs/common';

export interface DeviceTokenProps {
  id: string;
  userId: string;
  token: string;
  platform: DevicePlatformVO;
  provider: PushProviderVO;
  deviceId: string;
  channel: string;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DeviceToken {
  private constructor(private props: DeviceTokenProps) {}

  static create(props: Omit<DeviceTokenProps, 'id' | 'createdAt' | 'updatedAt'>): DeviceToken {
    const now = new Date();
    return new DeviceToken({
      ...props,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static createFromRaw(props: {
    userId: string;
    token: string;
    platform: string;
    provider: string;
    deviceId: string;
    channel: string;
    deviceName?: string;
    osVersion?: string;
    appVersion?: string;
    isActive?: boolean;
  }): DeviceToken {
    const platformVO = DevicePlatformVO.create(props.platform);
    const providerVO = PushProviderVO.create(props.provider);

    // Validate provider-platform compatibility
    if (!providerVO.isCompatibleWith(props.platform)) {
      throw new Error(
        `Provider ${props.provider} is not compatible with platform ${props.platform}`,
      );
    }

    // Create device token first
    const deviceToken = DeviceToken.create({
      userId: props.userId,
      token: props.token,
      platform: platformVO,
      provider: providerVO,
      deviceId: props.deviceId,
      channel: props.channel,
      deviceName: props.deviceName,
      osVersion: props.osVersion,
      appVersion: props.appVersion,
      isActive: props.isActive ?? true,
    });

    // Validate token format
    deviceToken.validateTokenFormat(props.token);

    return deviceToken;
  }

  static fromPersistence(props: DeviceTokenProps): DeviceToken {
    return new DeviceToken(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get token(): string {
    return this.props.token;
  }

  get platform(): DevicePlatformVO {
    return this.props.platform;
  }

  get provider(): PushProviderVO {
    return this.props.provider;
  }

  get deviceId(): string {
    return this.props.deviceId;
  }

  get channel(): string {
    return this.props.channel;
  }

  get deviceName(): string | undefined {
    return this.props.deviceName;
  }

  get osVersion(): string | undefined {
    return this.props.osVersion;
  }

  get appVersion(): string | undefined {
    return this.props.appVersion;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get lastUsedAt(): Date | undefined {
    return this.props.lastUsedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  updateToken(newToken: string): void {
    this.validateTokenFormat(newToken);
    this.props.token = newToken;
    this.props.updatedAt = new Date();
  }

  markAsActive(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  markAsInactive(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  updateLastUsed(): void {
    this.props.lastUsedAt = new Date();
    this.props.updatedAt = new Date();
  }

  // Validation methods
  private validateTokenFormat(token: string): void {
    if (!token || token.trim().length === 0) {
      throw new Error('Device token cannot be empty');
    }

    // FCM token validation (Android)
    if (this.provider.isFCM()) {
      if (!/^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(token)) {
        throw new Error('Invalid FCM token format');
      }
    }

    // APNs token validation (iOS)
    if (this.provider.isAPNS()) {
      if (!/^[A-Fa-f0-9]{64}$/.test(token)) {
        throw new Error('Invalid APNs token format');
      }
    }

    // Expo token validation (React Native)
    if (this.provider.isExpo()) {
      if (!/^ExponentPushToken\[[A-Za-z0-9_-]+\]$/.test(token)) {
        throw new Error('Invalid Expo token format');
      }
    }
  }

  // Business rules
  canBeUpdatedBy(userId: string): boolean {
    return this.userId === userId;
  }

  isExpired(): boolean {
    if (!this.lastUsedAt) {
      return false;
    }
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return this.lastUsedAt < ninetyDaysAgo;
  }

  toPersistence(): DeviceTokenProps {
    return { ...this.props };
  }
}

// Re-export enums for convenience
export { DevicePlatform } from './value-objects/device-platform.vo';
export { PushProvider } from './value-objects/push-provider.vo';
