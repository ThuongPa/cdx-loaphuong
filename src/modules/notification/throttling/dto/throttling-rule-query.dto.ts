import { ThrottlingType, ThrottlingScope, ThrottlingStatus } from '../throttling.schema';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { SortDto } from '../../../../common/dto/sort.dto';
import { FilterDto } from '../../../../common/dto/filter.dto';
import { Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsDateString,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class ThrottlingRuleQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ThrottlingType)
  type?: ThrottlingType;

  @IsOptional()
  @IsEnum(ThrottlingScope)
  scope?: ThrottlingScope;

  @IsOptional()
  @IsEnum(ThrottlingStatus)
  status?: ThrottlingStatus;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
