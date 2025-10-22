import { IsString, IsEnum, IsOptional, IsObject, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { LifecycleStage, RetentionPolicy } from '../lifecycle.schema';

export class UpdateLifecycleDto {
  @IsOptional()
  @IsEnum(LifecycleStage)
  currentStage?: LifecycleStage;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  policy?: {
    policy: RetentionPolicy;
    retentionDays?: number;
    archivalDays?: number;
    deletionDays?: number;
  };
}
