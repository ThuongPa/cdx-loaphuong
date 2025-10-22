import { IsString, IsArray, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class MarkReadDto {
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];

  @IsOptional()
  @IsBoolean()
  markAll?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
