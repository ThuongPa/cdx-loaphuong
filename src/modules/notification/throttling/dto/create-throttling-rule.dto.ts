import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ThrottlingType, ThrottlingScope } from '../throttling.schema';

export class ThrottlingLimitsDto {
  @IsNumber()
  maxNotifications: number;

  @IsNumber()
  timeWindowMs: number;

  @IsOptional()
  @IsNumber()
  burstLimit?: number;

  @IsOptional()
  @IsNumber()
  burstWindowMs?: number;

  @IsOptional()
  @IsNumber()
  cooldownMs?: number;
}

export class TimeRestrictionsDto {
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];
}

export class ThrottlingConditionsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priorities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userSegments?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRestrictionsDto)
  timeRestrictions?: TimeRestrictionsDto;

  @IsOptional()
  @IsObject()
  customRules?: Record<string, any>;
}

export class CreateThrottlingRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ThrottlingType)
  type: ThrottlingType;

  @IsEnum(ThrottlingScope)
  scope: ThrottlingScope;

  @ValidateNested()
  @Type(() => ThrottlingLimitsDto)
  limits: ThrottlingLimitsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThrottlingConditionsDto)
  conditions?: ThrottlingConditionsDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
