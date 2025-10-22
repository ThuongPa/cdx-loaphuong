import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsObject,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '../../../../common/types/notification.types';

// Placeholder DTO - this should be created properly
interface NotificationTargetDto {
  userIds?: string[];
  userSegments?: string[];
  categories?: string[];
  channels?: string[];
  criteria?: any;
}

export class BroadcastNotificationDto {
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
  @Type(() => Object)
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
