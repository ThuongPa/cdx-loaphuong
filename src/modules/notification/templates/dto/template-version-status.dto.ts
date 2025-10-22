import { IsString, IsEnum, IsOptional, IsObject, IsDateString } from 'class-validator';

export enum TemplateVersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated',
}

export class TemplateVersionStatusDto {
  @IsString()
  templateId: string;

  @IsString()
  versionId: string;

  @IsEnum(TemplateVersionStatus)
  status: TemplateVersionStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsDateString()
  archivedAt?: string;

  @IsOptional()
  @IsDateString()
  deprecatedAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
