import { IsString, IsArray, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateVersionDiffDto } from './template-version-diff.dto';
import { Res } from '@nestjs/common';

export class TemplateVersionDiffResponseDto {
  @IsString()
  templateId: string;

  @IsString()
  version1: string;

  @IsString()
  version2: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVersionDiffDto)
  diffs: TemplateVersionDiffDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
