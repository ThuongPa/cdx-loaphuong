import { IsString, IsOptional, IsObject, IsArray, IsEnum, IsDateString } from 'class-validator';

export class CreateAnalyticsDto {
  @IsString()
  eventName: string;

  @IsString()
  userId: string;

  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsDateString()
  @IsOptional()
  timestamp?: string;
}

export class AnalyticsReportDto {
  @IsString()
  metricName: string;

  @IsEnum(['hour', 'day', 'week', 'month'])
  period: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray()
  @IsOptional()
  dimensions?: string[];

  @IsArray()
  @IsOptional()
  groupBy?: string[];
}

export class AnalyticsInsightsDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
