import {
  ChannelPreferences,
  TypePreferences,
  QuietHours,
} from '../../domain/user-preferences.entity';
import { ApiProperty } from '@nestjs/swagger';

export class PreferencesResponseDto {
  @ApiProperty({ description: 'Unique identifier for the preferences' })
  public readonly id: string;

  @ApiProperty({ description: 'User ID' })
  public readonly userId: string;

  @ApiProperty({ description: 'Channel notification preferences' })
  public readonly channels: ChannelPreferences;

  @ApiProperty({ description: 'Notification type preferences' })
  public readonly types: TypePreferences;

  @ApiProperty({ description: 'Quiet hours configuration' })
  public readonly quietHours: QuietHours;

  @ApiProperty({ description: 'Creation timestamp' })
  public readonly createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  public readonly updatedAt: Date;

  constructor(
    id: string,
    userId: string,
    channels: ChannelPreferences,
    types: TypePreferences,
    quietHours: QuietHours,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.userId = userId;
    this.channels = channels;
    this.types = types;
    this.quietHours = quietHours;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
