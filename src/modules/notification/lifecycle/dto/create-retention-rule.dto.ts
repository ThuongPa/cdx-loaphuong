import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LifecycleStage, RetentionPolicy } from '../lifecycle.schema';

export class CreateRetentionRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RetentionPolicy)
  policy: RetentionPolicy;

  @IsObject()
  conditions: {
    stages?: LifecycleStage[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    userSegments?: string[];
    notificationTypes?: string[];
    ageThreshold?: number;
  };

  @IsObject()
  actions: {
    archive?: {
      enabled: boolean;
      afterDays?: number;
    };
    delete?: {
      enabled: boolean;
      afterDays?: number;
    };
    anonymize?: {
      enabled: boolean;
      fields?: string[];
    };
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
