import { IsArray, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateResponseDto } from './template-response.dto';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { Res } from '@nestjs/common';

export class TemplateListResponseDto extends PaginationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateResponseDto)
  templates: TemplateResponseDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
