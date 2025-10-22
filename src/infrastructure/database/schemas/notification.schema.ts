import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, maxlength: 200 })
  title: string;

  @Prop({ required: true, maxlength: 1000 })
  body: string;

  @Prop({ required: true, enum: ['payment', 'booking', 'announcement', 'emergency'] })
  type: string;

  @Prop({ required: true, enum: ['urgent', 'high', 'normal', 'low'] })
  priority: string;

  @Prop({ required: true, type: [String], enum: ['push', 'email', 'inApp'] })
  channels: string[];

  @Prop({ required: true, type: [String] })
  targetRoles: string[];

  @Prop({ required: true, type: [String] })
  targetUsers: string[];

  @Prop({ required: true, type: Object })
  data: Record<string, any>;

  @Prop({ required: true, enum: ['draft', 'scheduled', 'sent', 'failed'], default: 'draft' })
  status: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Create indexes for performance
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ targetRoles: 1, status: 1 });
NotificationSchema.index({ targetUsers: 1, status: 1 });
NotificationSchema.index({ type: 1, priority: 1 });
NotificationSchema.index({ createdAt: -1 });
