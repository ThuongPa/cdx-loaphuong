import { IsString, IsEnum, IsOptional, IsObject, IsArray, IsNumber } from 'class-validator';
import { Res } from '@nestjs/common';

export enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class BatchOperationDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsEnum(BatchStatus)
  status: BatchStatus;

  @IsNumber()
  totalItems: number;

  @IsNumber()
  processedItems: number;

  @IsNumber()
  failedItems: number;

  @IsNumber()
  successItems: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  failedAt?: string;
}

export class BatchResultDto {
  @IsString()
  batchId: string;

  @IsEnum(BatchStatus)
  status: BatchStatus;

  @IsNumber()
  totalItems: number;

  @IsNumber()
  processedItems: number;

  @IsNumber()
  failedItems: number;

  @IsNumber()
  successItems: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  results?: Record<string, any>;
}
