import { IsString, IsOptional, IsObject, IsDateString, IsArray, IsBoolean } from 'class-validator';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { SortDto } from '../../../../common/dto/sort.dto';
import { FilterDto } from '../../../../common/dto/filter.dto';
import { Query } from '@nestjs/common';

export class UserProfileQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  userId?: string;

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
