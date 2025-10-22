import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray } from 'class-validator';

export class CreateSyncConfigurationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @IsOptional()
  @IsNumber()
  retryDelay?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledSources?: string[];
}
