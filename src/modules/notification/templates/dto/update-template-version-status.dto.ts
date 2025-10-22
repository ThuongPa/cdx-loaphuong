import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { TemplateVersionStatus } from './template-version-status.dto';

export class UpdateTemplateVersionStatusDto {
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
  @IsObject()
  metadata?: Record<string, any>;
}
