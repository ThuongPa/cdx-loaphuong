export enum PushProvider {
  FCM = 'fcm',
  APNS = 'apns',
  EXPO = 'expo',
}

export class PushProviderVO {
  private constructor(private readonly _value: PushProvider) {}

  static create(provider: string): PushProviderVO {
    const normalizedProvider = provider.toLowerCase().trim();

    if (!Object.values(PushProvider).includes(normalizedProvider as PushProvider)) {
      throw new Error(
        `Invalid push provider: ${provider}. Supported providers: ${Object.values(PushProvider).join(', ')}`,
      );
    }

    return new PushProviderVO(normalizedProvider as PushProvider);
  }

  get value(): PushProvider {
    return this._value;
  }

  isFCM(): boolean {
    return this.value === PushProvider.FCM;
  }

  isAPNS(): boolean {
    return this.value === PushProvider.APNS;
  }

  isExpo(): boolean {
    return this.value === PushProvider.EXPO;
  }

  // Business rules for provider-platform compatibility
  isCompatibleWith(platform: string): boolean {
    const normalizedPlatform = platform.toLowerCase().trim();

    switch (this.value) {
      case PushProvider.FCM:
        return normalizedPlatform === 'android' || normalizedPlatform === 'web';
      case PushProvider.APNS:
        return normalizedPlatform === 'ios';
      case PushProvider.EXPO:
        return normalizedPlatform === 'ios' || normalizedPlatform === 'android';
      default:
        return false;
    }
  }

  getDefaultPlatform(): string {
    switch (this.value) {
      case PushProvider.FCM:
        return 'android';
      case PushProvider.APNS:
        return 'ios';
      case PushProvider.EXPO:
        return 'android';
      default:
        throw new Error(`No default platform for provider: ${this.value}`);
    }
  }

  equals(other: PushProviderVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
