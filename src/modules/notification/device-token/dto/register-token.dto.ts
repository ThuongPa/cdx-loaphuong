import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export enum PushProvider {
  FCM = 'fcm',
  APNS = 'apns',
  EXPO = 'expo',
}

export class RegisterTokenDto {
  @IsString()
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsString()
  deviceId: string;

  @IsEnum(PushProvider)
  provider: PushProvider;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
