import { IsString, IsArray, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateVersionDto } from './template-version.dto';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class TemplateVersionHistoryDto extends PaginationDto {
  @IsString()
  templateId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVersionDto)
  versions: TemplateVersionDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
