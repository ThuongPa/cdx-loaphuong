import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';
import { Type } from 'class-transformer';

export class CloneTemplateDto {
  @IsString()
  templateId: string;

  @IsString()
  newName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
