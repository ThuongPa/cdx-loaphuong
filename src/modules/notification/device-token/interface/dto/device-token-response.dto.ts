import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform, PushProvider } from '../../domain/device-token.entity';
import { Res } from '@nestjs/common';

export class DeviceTokenResponseDto {
  @ApiProperty({
    description: 'Device token unique identifier',
    example: 'clr1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'User identifier',
    example: 'user-12345',
  })
  userId: string;

  @ApiProperty({
    description: 'Device push notification token',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  token: string;

  @ApiProperty({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  platform: DevicePlatform;

  @ApiProperty({
    description: 'Push notification provider',
    enum: PushProvider,
    example: PushProvider.EXPO,
  })
  provider: PushProvider;

  @ApiProperty({
    description: 'Unique device identifier',
    example: 'device-12345',
  })
  deviceId: string;

  @ApiProperty({
    description: 'Token active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({ description: 'Device name', example: 'iPhone 15 Pro', required: false })
  deviceName?: string;

  @ApiProperty({ description: 'OS version', example: '17.0', required: false })
  osVersion?: string;

  @ApiProperty({ description: 'App version', example: '1.0.0', required: false })
  appVersion?: string;

  @ApiProperty({
    description: 'Last successful push notification timestamp',
    example: '2025-01-27T10:30:00.000Z',
    required: false,
  })
  lastUsedAt?: Date;

  @ApiProperty({
    description: 'Token creation timestamp',
    example: '2025-01-27T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Token last update timestamp',
    example: '2025-01-27T10:30:00.000Z',
  })
  updatedAt: Date;
}
