import { Type } from 'class-transformer';
import { ChannelPreferencesDto, TypePreferencesDto, QuietHoursDto } from './update-preferences.dto';
import {
  IsString,
  IsObject,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';

export enum NotificationFrequency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export class NotificationPreferencesDto {
  @IsString()
  userId: string;

  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  channels: ChannelPreferencesDto;

  @ValidateNested()
  @Type(() => TypePreferencesDto)
  types: TypePreferencesDto;

  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours: QuietHoursDto;

  @IsOptional()
  @IsEnum(NotificationFrequency)
  frequency?: NotificationFrequency;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedChannels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedTypes?: string[];

  @IsOptional()
  @IsString()
  maxPriority?: string;

  @IsOptional()
  @IsBoolean()
  emergencyOverride?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
