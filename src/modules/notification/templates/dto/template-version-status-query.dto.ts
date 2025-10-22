import { IsString, IsEnum, IsOptional, IsObject, IsArray } from 'class-validator';
import { TemplateVersionStatus } from './template-version-status.dto';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { SortDto } from '../../../../common/dto/sort.dto';
import { FilterDto } from '../../../../common/dto/filter.dto';
import { Query } from '@nestjs/common';

export class TemplateVersionStatusQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  versionId?: string;

  @IsOptional()
  @IsEnum(TemplateVersionStatus)
  status?: TemplateVersionStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  environments?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
