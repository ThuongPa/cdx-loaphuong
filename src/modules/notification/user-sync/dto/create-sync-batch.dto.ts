import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, IsDateString } from 'class-validator';

export class CreateSyncBatchDto {
  @IsString()
  batchId: string;

  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @IsOptional()
  @IsBoolean()
  isPriority?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
