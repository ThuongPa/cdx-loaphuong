import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class ThrottlingViolationDto {
  @IsString()
  id: string;

  @IsString()
  ruleId: string;

  @IsString()
  identifier: string;

  @IsString()
  eventType: string;

  @IsEnum(ViolationSeverity)
  severity: ViolationSeverity;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  retryAfter?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  timestamp: string;
}
