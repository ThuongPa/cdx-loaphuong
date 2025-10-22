import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { Res } from '@nestjs/common';

export class RestoreTemplateVersionDto {
  @IsString()
  templateId: string;

  @IsString()
  versionId: string;

  @IsOptional()
  @IsBoolean()
  createNewVersion?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
