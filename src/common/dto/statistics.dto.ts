import { IsString, IsNumber, IsOptional, IsObject, IsDateString } from 'class-validator';
import { Res } from '@nestjs/common';

export class StatisticsDto {
  @IsString()
  metric: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TimeSeriesDataDto {
  @IsString()
  label: string;

  @IsNumber()
  value: number;

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class StatisticsResponseDto {
  @IsString()
  period: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsObject()
  metrics: Record<string, StatisticsDto>;

  @IsOptional()
  @IsObject()
  timeSeries?: TimeSeriesDataDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
