import { IsString, IsOptional, IsObject } from 'class-validator';

export class RetryNotificationDto {
  @IsString()
  notificationId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
