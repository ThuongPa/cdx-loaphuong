import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class ThrottlingStatsDto {
  @IsString()
  metric: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ThrottlingStatisticsDto {
  @IsString()
  period: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  totalViolations: number;

  @IsNumber()
  totalRules: number;

  @IsNumber()
  totalProfiles: number;

  @IsOptional()
  @IsNumber()
  averageViolationsPerRule?: number;

  @IsOptional()
  @IsNumber()
  averageViolationsPerProfile?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThrottlingStatsDto)
  ruleStats: ThrottlingStatsDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThrottlingStatsDto)
  profileStats: ThrottlingStatsDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
