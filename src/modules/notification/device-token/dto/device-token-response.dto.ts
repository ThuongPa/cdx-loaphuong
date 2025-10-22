import { IsString, IsEnum, IsBoolean, IsOptional, IsObject, IsDateString } from 'class-validator';
import { DevicePlatform, PushProvider } from './register-token.dto';
import { Res } from '@nestjs/common';

export class DeviceTokenResponseDto {
  @IsString()
  id: string;

  @IsString()
  userId: string;

  @IsString()
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsEnum(PushProvider)
  provider: PushProvider;

  @IsString()
  deviceId: string;

  @IsBoolean()
  isActive: boolean;

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
  @IsDateString()
  lastUsedAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
