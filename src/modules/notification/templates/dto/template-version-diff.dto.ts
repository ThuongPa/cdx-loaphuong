import { IsString, IsObject, IsOptional, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum DiffType {
  ADDED = 'added',
  REMOVED = 'removed',
  MODIFIED = 'modified',
  UNCHANGED = 'unchanged',
}

export class TemplateVersionDiffDto {
  @IsString()
  field: string;

  @IsEnum(DiffType)
  type: DiffType;

  @IsOptional()
  @IsString()
  oldValue?: string;

  @IsOptional()
  @IsString()
  newValue?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
