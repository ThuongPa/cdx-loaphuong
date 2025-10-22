import { Type } from 'class-transformer';
import { ChannelPreferencesDto, TypePreferencesDto, QuietHoursDto } from './update-preferences.dto';
import { Res } from '@nestjs/common';
import {
  IsString,
  IsObject,
  IsBoolean,
  IsOptional,
  IsDateString,
  ValidateNested,
} from 'class-validator';

export class PreferencesResponseDto {
  @IsString()
  id: string;

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
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
