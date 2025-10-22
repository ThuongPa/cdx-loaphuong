import { IsString, IsOptional, IsObject, IsBoolean, IsArray } from 'class-validator';

export class UnpublishTemplateVersionDto {
  @IsString()
  templateId: string;

  @IsString()
  versionId: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  environments?: string[];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
