import { IsString, IsObject, IsOptional, IsArray, IsEnum } from 'class-validator';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';
import { Type } from 'class-transformer';

export class TestTemplateDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
