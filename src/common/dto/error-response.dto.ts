import { IsString, IsNumber, IsOptional, IsObject, IsArray } from 'class-validator';
import { Res } from '@nestjs/common';

export class ErrorDetailDto {
  @IsString()
  field: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class ErrorResponseDto {
  @IsString()
  message: string;

  @IsNumber()
  statusCode: number;

  @IsString()
  error: string;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsArray()
  details?: ErrorDetailDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
