import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationPriority } from '../../../../../common/types/notification.types';

export class BroadcastNotificationDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'System Maintenance',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification body',
    example: 'System will be under maintenance from 2AM to 4AM',
  })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Target user roles',
    example: ['resident', 'staff'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  targetRoles: string[];

  @ApiProperty({
    description: 'Specific target users (optional)',
    example: ['user1', 'user2'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetUsers?: string[];

  @ApiProperty({
    description: 'Notification channels',
    example: ['push', 'email', 'inApp'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @ApiProperty({
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.HIGH,
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Scheduled send time (optional)',
    example: '2025-01-27T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({
    description: 'Additional data (optional)',
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class BroadcastNotificationResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Broadcast ID' })
  broadcastId: string;

  @ApiProperty({ description: 'Target user count' })
  targetUserCount: number;

  @ApiProperty({ description: 'Response message' })
  message: string;
}
