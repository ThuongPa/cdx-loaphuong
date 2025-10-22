import { IsString, IsNumber, IsOptional, IsObject, IsDateString, IsBoolean } from 'class-validator';

export class TemplateVersionDto {
  @IsString()
  id: string;

  @IsString()
  templateId: string;

  @IsNumber()
  version: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
