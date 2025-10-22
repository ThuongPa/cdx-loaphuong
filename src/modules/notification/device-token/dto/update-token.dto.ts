import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateTokenDto {
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
