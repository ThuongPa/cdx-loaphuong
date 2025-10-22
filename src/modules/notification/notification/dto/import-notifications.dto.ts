import { IsString, IsEnum, IsOptional, IsObject, IsArray, IsBoolean } from 'class-validator';
import { ExportFormat } from './export-notifications.dto';

export class ImportNotificationsDto {
  @IsString()
  filePath: string;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  skipErrors?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredFields?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
