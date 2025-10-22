import { IsArray, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateVersionDto } from './template-version.dto';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class TemplateVersionListDto extends PaginationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVersionDto)
  versions: TemplateVersionDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
