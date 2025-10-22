import { IsArray, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateVersionStatusDto } from './template-version-status.dto';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class TemplateVersionStatusListDto extends PaginationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVersionStatusDto)
  statuses: TemplateVersionStatusDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
