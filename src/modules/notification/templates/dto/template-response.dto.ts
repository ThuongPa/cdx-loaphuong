import { Type } from 'class-transformer';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';
import { TemplateVariableDto } from './template-variable.dto';
import { Res } from '@nestjs/common';
import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsObject,
  IsBoolean,
  IsDateString,
  ValidateNested,
} from 'class-validator';

export class TemplateResponseDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables: TemplateVariableDto[];

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
