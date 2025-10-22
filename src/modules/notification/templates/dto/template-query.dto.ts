import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, IsArray } from 'class-validator';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { SortDto } from '../../../../common/dto/sort.dto';
import { FilterDto } from '../../../../common/dto/filter.dto';
import { Query } from '@nestjs/common';
import { Type } from 'class-transformer';

export class TemplateQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

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
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
