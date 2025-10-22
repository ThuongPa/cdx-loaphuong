import {
  IsOptional,
  IsBoolean,
  IsString,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChannelPreferencesDto {
  @ApiProperty({ description: 'Email notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiProperty({ description: 'SMS notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiProperty({ description: 'Push notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiProperty({ description: 'In-app notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @ApiProperty({ description: 'Webhook notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  webhook?: boolean;
}

export class TypePreferencesDto {
  @ApiProperty({ description: 'Payment notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  payment?: boolean;

  @ApiProperty({ description: 'Order notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  order?: boolean;

  @ApiProperty({ description: 'Promotion notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  promotion?: boolean;

  @ApiProperty({ description: 'System notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  system?: boolean;

  @ApiProperty({ description: 'Security notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  security?: boolean;

  @ApiProperty({
    description: 'Emergency notifications enabled (cannot be disabled)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  emergency?: boolean;

  @ApiProperty({ description: 'Booking notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  booking?: boolean;

  @ApiProperty({ description: 'Announcement notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  announcement?: boolean;
}

export class QuietHoursDto {
  @ApiProperty({ description: 'Quiet hours enabled', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Start time for quiet hours (HH:mm format)', required: false })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ description: 'End time for quiet hours (HH:mm format)', required: false })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ description: 'Timezone for quiet hours', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Days of week for quiet hours (0=Sunday, 1=Monday, etc.)',
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  days?: number[];
}

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Channel notification preferences',
    required: false,
    type: ChannelPreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  channels?: ChannelPreferencesDto;

  @ApiProperty({
    description: 'Notification type preferences',
    required: false,
    type: TypePreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TypePreferencesDto)
  types?: TypePreferencesDto;

  @ApiProperty({ description: 'Quiet hours configuration', required: false, type: QuietHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;
}
