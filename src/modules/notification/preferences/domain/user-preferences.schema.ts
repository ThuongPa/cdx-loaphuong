import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserPreferencesDocument = UserPreferences & Document;

@Schema({ timestamps: true })
export class UserPreferences {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ type: Object, required: true })
  channelPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
    webhook: boolean;
  };

  @Prop({ type: Object, required: true })
  typePreferences: {
    payment: boolean;
    order: boolean;
    promotion: boolean;
    system: boolean;
    security: boolean;
    emergency: boolean;
    booking: boolean;
    announcement: boolean;
  };

  @Prop({ type: Object, required: true })
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
    days: number[];
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  // Methods
  shouldSendNotification(type: string, channel: string): boolean {
    const typeKey = this.getTypeKey(type);
    const channelKey = this.getChannelKey(channel);

    return this.typePreferences[typeKey] && this.channelPreferences[channelKey];
  }

  isChannelEnabled(channel: string): boolean {
    const channelKey = this.getChannelKey(channel);
    return this.channelPreferences[channelKey];
  }

  isInQuietHours(): boolean {
    if (!this.quietHours.enabled) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();

    const [startHour, startMinute] = this.quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = this.quietHours.endTime.split(':').map(Number);

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    const isInTimeRange =
      startTime <= endTime
        ? currentTime >= startTime && currentTime <= endTime
        : currentTime >= startTime || currentTime <= endTime;

    return isInTimeRange && this.quietHours.days.includes(currentDay);
  }

  getTypeKey(type: string): keyof typeof this.typePreferences {
    const typeMap: Record<string, keyof typeof this.typePreferences> = {
      payment: 'payment',
      order: 'order',
      promotion: 'promotion',
      system: 'system',
      security: 'security',
      emergency: 'emergency',
      booking: 'booking',
      announcement: 'announcement',
    };
    return typeMap[type] || 'system';
  }

  getChannelKey(channel: string): keyof typeof this.channelPreferences {
    const channelMap: Record<string, keyof typeof this.channelPreferences> = {
      email: 'email',
      sms: 'sms',
      push: 'push',
      inApp: 'inApp',
      webhook: 'webhook',
    };
    return channelMap[channel] || 'email';
  }

  updateChannelPreferences(preferences: Partial<typeof this.channelPreferences>): void {
    this.channelPreferences = { ...this.channelPreferences, ...preferences };
    this.updatedAt = new Date();
  }

  updateTypePreferences(preferences: Partial<typeof this.typePreferences>): void {
    this.typePreferences = { ...this.typePreferences, ...preferences };
    this.updatedAt = new Date();
  }

  updateQuietHours(quietHours: Partial<typeof this.quietHours>): void {
    this.quietHours = { ...this.quietHours, ...quietHours };
    this.updatedAt = new Date();
  }
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);
