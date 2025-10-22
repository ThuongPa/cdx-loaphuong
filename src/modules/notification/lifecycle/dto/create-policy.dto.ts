import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { LifecycleStage, RetentionPolicy } from '../lifecycle.schema';

export class CreatePolicyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RetentionPolicy)
  retentionPolicy: RetentionPolicy;

  @IsObject()
  actions: {
    archive?: {
      enabled: boolean;
      afterDays?: number;
      conditions?: Record<string, any>;
    };
    delete?: {
      enabled: boolean;
      afterDays?: number;
      conditions?: Record<string, any>;
    };
    notify?: {
      enabled: boolean;
      beforeDays?: number;
      channels?: string[];
    };
  };

  @IsOptional()
  @IsObject()
  conditions?: {
    stages?: LifecycleStage[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    userSegments?: string[];
    notificationTypes?: string[];
  };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
