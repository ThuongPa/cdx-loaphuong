export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export class DevicePlatformVO {
  private constructor(private readonly _value: DevicePlatform) {}

  static create(platform: string): DevicePlatformVO {
    const normalizedPlatform = platform.toLowerCase().trim();

    if (!Object.values(DevicePlatform).includes(normalizedPlatform as DevicePlatform)) {
      throw new Error(
        `Invalid device platform: ${platform}. Supported platforms: ${Object.values(DevicePlatform).join(', ')}`,
      );
    }

    return new DevicePlatformVO(normalizedPlatform as DevicePlatform);
  }

  get value(): DevicePlatform {
    return this._value;
  }

  isIOS(): boolean {
    return this.value === DevicePlatform.IOS;
  }

  isAndroid(): boolean {
    return this.value === DevicePlatform.ANDROID;
  }

  isWeb(): boolean {
    return this.value === DevicePlatform.WEB;
  }

  equals(other: DevicePlatformVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
