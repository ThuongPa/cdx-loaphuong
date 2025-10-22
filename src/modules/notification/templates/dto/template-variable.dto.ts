import { IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  OBJECT = 'object',
  ARRAY = 'array',
}

export class TemplateVariableDto {
  @IsString()
  name: string;

  @IsEnum(VariableType)
  type: VariableType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsObject()
  validation?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
