import { Type } from 'class-transformer';
import { ThrottlingType, ThrottlingScope, ThrottlingStatus } from '../throttling.schema';
import { ThrottlingLimitsDto, ThrottlingConditionsDto } from './create-throttling-rule.dto';
import { Res } from '@nestjs/common';
import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
  ValidateNested,
} from 'class-validator';

export class ThrottlingRuleResponseDto {
  @IsString()
  id: string;

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

  @IsEnum(ThrottlingStatus)
  status: ThrottlingStatus;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
