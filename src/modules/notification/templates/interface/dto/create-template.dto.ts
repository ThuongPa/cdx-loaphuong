import { IsString, IsEnum, IsArray, IsOptional, IsBoolean, IsObject } from 'class-validator';
import {
  NotificationType,
  NotificationChannel,
} from '../../../../../common/types/notification.types';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsString()
  language: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
