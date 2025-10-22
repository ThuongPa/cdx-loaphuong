import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { IsString, IsEnum, IsArray, IsOptional, IsObject, IsDateString } from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '../../../../common/types/notification.types';

export class NotificationTargetDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  users?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  segments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ValidateNested()
  @Type(() => NotificationTargetDto)
  target: NotificationTargetDto;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
