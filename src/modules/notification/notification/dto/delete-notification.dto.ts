import { IsString, IsArray, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { Delete } from '@nestjs/common';

export class DeleteNotificationDto {
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];

  @IsOptional()
  @IsBoolean()
  deleteAll?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
