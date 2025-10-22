import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class RollbackTemplateVersionDto {
  @IsString()
  templateId: string;

  @IsString()
  versionId: string;

  @IsOptional()
  @IsBoolean()
  createBackup?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
