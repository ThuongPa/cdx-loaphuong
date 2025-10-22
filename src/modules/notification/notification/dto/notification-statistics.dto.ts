import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsDateString,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '../../../../common/types/notification.types';

export class NotificationStatsDto {
  @IsString()
  type: string;

  @IsNumber()
  count: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ChannelStatsDto {
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsNumber()
  total: number;

  @IsNumber()
  sent: number;

  @IsNumber()
  delivered: number;

  @IsNumber()
  failed: number;

  @IsNumber()
  pending: number;

  @IsOptional()
  @IsNumber()
  successRate?: number;

  @IsOptional()
  @IsNumber()
  deliveryRate?: number;
}

export class NotificationStatisticsDto {
  @IsString()
  period: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  totalNotifications: number;

  @IsNumber()
  sentNotifications: number;

  @IsNumber()
  deliveredNotifications: number;

  @IsNumber()
  failedNotifications: number;

  @IsNumber()
  pendingNotifications: number;

  @IsOptional()
  @IsNumber()
  successRate?: number;

  @IsOptional()
  @IsNumber()
  deliveryRate?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationStatsDto)
  typeStats: NotificationStatsDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelStatsDto)
  channelStats: ChannelStatsDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
