import { IsOptional, IsString, IsNumber, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

import { SyncType, SyncSource } from '../user-sync.schema';

export class UserSyncFilters {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(SyncStatus)
  status?: SyncStatus;

  @IsOptional()
  @IsEnum(SyncType)
  type?: SyncType;

  @IsOptional()
  @IsEnum(SyncSource)
  source?: SyncSource;

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @IsOptional()
  @IsDateString()
  createdAtFrom?: string;

  @IsOptional()
  @IsDateString()
  createdAtTo?: string;
}

export class UserSyncPaginationOptions {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}
