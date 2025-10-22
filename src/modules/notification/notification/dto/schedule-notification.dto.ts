import { IsString, IsDateString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateNotificationDto } from './create-notification.dto';

export enum ScheduleType {
  ONCE = 'once',
  RECURRING = 'recurring',
  CRON = 'cron',
}

export class ScheduleNotificationDto extends CreateNotificationDto {
  @IsDateString()
  declare scheduledAt: string;

  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  scheduleMetadata?: Record<string, any>;
}
