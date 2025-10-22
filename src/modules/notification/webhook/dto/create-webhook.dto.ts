import {
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUrl,
} from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  name: string;

  @IsString()
  url: string;

  @IsArray()
  @IsString({ each: true })
  events: string[];

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsNumber()
  timeout?: number = 30000;

  @IsOptional()
  @IsNumber()
  retryCount?: number = 3;

  @IsOptional()
  @IsNumber()
  retryDelay?: number = 1000;
}
