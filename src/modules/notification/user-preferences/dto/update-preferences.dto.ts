import { IsObject, IsOptional, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChannelPreferencesDto {
  @IsBoolean()
  push: boolean;

  @IsBoolean()
  email: boolean;

  @IsBoolean()
  inApp: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;
}

export class TypePreferencesDto {
  @IsBoolean()
  payment: boolean;

  @IsBoolean()
  booking: boolean;

  @IsBoolean()
  announcement: boolean;

  @IsBoolean()
  emergency: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

export class QuietHoursDto {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  start: string;

  @IsString()
  end: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  channels?: ChannelPreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TypePreferencesDto)
  types?: TypePreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
