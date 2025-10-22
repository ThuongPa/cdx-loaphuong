import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';

import { SyncType, SyncSource } from '../user-sync.schema';

export class CreateUserSyncDto {
  @IsString()
  userId: string;

  @IsEnum(SyncType)
  type: SyncType;

  @IsEnum(SyncSource)
  source: SyncSource;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
