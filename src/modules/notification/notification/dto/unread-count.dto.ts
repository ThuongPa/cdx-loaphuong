import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class UnreadCountDto {
  @IsString()
  userId: string;

  @IsNumber()
  total: number;

  @IsOptional()
  @IsNumber()
  byType?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  byChannel?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  byPriority?: Record<string, number>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
