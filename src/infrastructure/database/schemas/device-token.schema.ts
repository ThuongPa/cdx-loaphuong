import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationChannel } from '../../../common/types/notification.types';

export type DeviceTokenDocument = DeviceToken & Document;

@Schema({ timestamps: true })
export class DeviceToken {
  @Prop({ required: true })
  _id: string; // CUID

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  channel: string;

  @Prop({ required: true })
  deviceId: string;

  @Prop()
  deviceType?: string;

  @Prop()
  appVersion?: string;

  @Prop()
  osVersion?: string;

  @Prop()
  platform?: string;

  @Prop()
  provider?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastUsedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);
