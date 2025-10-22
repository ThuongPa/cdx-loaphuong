import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform, PushProvider } from '../../domain/device-token.entity';

export class RegisterTokenDto {
  @ApiProperty({
    description: 'Device push notification token',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiProperty({
    description: 'Push notification provider',
    enum: PushProvider,
    example: PushProvider.EXPO,
  })
  @IsEnum(PushProvider)
  provider: PushProvider;

  @ApiProperty({
    description: 'Unique device identifier',
    example: 'device-12345',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ description: 'Device name', example: 'iPhone 14 Pro', required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({ description: 'OS version', example: 'iOS 17.2', required: false })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiProperty({ description: 'App version', example: '1.3.5', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
