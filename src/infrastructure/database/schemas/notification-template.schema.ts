import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NotificationType, NotificationChannel } from '../../../common/types/notification.types';
import { Document } from 'mongoose';
import { Type } from 'class-transformer';

export type NotificationTemplateDocument = NotificationTemplate & Document;

@Schema({ timestamps: true })
export class NotificationTemplate {
  @Prop({ required: true })
  _id: string; // CUID

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: Object.values(NotificationType) })
  type: NotificationType;

  @Prop({ required: true, enum: Object.values(NotificationChannel) })
  channel: NotificationChannel;

  @Prop({ required: false })
  subject?: string;

  @Prop({ required: true })
  body: string;

  @Prop({ required: true, default: 'vi' })
  language: string;

  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate);

// Indexes
NotificationTemplateSchema.index({ name: 1 });
NotificationTemplateSchema.index({ type: 1 });
NotificationTemplateSchema.index({ channel: 1 });
NotificationTemplateSchema.index({ language: 1 });
NotificationTemplateSchema.index({ isActive: 1 });
NotificationTemplateSchema.index({ createdBy: 1 });

// Compound indexes for performance
NotificationTemplateSchema.index({ type: 1, channel: 1, language: 1, isActive: 1 });
NotificationTemplateSchema.index({ name: 1, isActive: 1 });
NotificationTemplateSchema.index({ createdBy: 1, createdAt: -1 });
