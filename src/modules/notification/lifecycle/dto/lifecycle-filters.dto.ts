import { IsString, IsEnum, IsOptional, IsObject, IsDateString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { LifecycleStage, RetentionPolicy, ArchivalStatus } from '../lifecycle.schema';

export class LifecycleFilters {
  @IsOptional()
  @IsString()
  notificationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(LifecycleStage)
  currentStage?: LifecycleStage;

  @IsOptional()
  @IsArray()
  @IsEnum(LifecycleStage, { each: true })
  stages?: LifecycleStage[];

  @IsOptional()
  @IsEnum(RetentionPolicy)
  retentionPolicy?: RetentionPolicy;

  @IsOptional()
  @IsEnum(ArchivalStatus)
  archivalStatus?: ArchivalStatus;

  @IsOptional()
  @IsObject()
  timeRange?: {
    start: Date;
    end: Date;
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
