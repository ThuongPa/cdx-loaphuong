import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class CompareTemplateVersionsDto {
  @IsString()
  templateId: string;

  @IsString()
  version1: string;

  @IsString()
  version2: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
