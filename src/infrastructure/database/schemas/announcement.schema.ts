import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../../common/types/notification.types';
import { Document } from 'mongoose';
import { NotificationStatus } from '../../../common/enums/notification-status.enum';
import { Type } from 'class-transformer';

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ required: true })
  _id: string; // CUID

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ required: true, enum: Object.values(NotificationType) })
  type: NotificationType;

  @Prop({ required: true, enum: Object.values(NotificationPriority) })
  priority: NotificationPriority;

  @Prop({ type: [String], enum: Object.values(NotificationChannel), required: true })
  channels: NotificationChannel[];

  @Prop({ type: [String], default: [] })
  targetRoles: string[];

  @Prop({ type: [String], default: [] })
  targetUsers: string[];

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;

  @Prop({ required: false })
  templateId?: string;

  @Prop({ required: false })
  scheduledAt?: Date;

  @Prop({
    required: true,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.DRAFT,
  })
  status: NotificationStatus;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

// Indexes
AnnouncementSchema.index({ type: 1 });
AnnouncementSchema.index({ priority: 1 });
AnnouncementSchema.index({ status: 1 });
AnnouncementSchema.index({ createdBy: 1 });
AnnouncementSchema.index({ scheduledAt: 1 });
AnnouncementSchema.index({ targetRoles: 1 });
AnnouncementSchema.index({ targetUsers: 1 });
AnnouncementSchema.index({ createdAt: 1 });

// Compound indexes for performance
AnnouncementSchema.index({ status: 1, scheduledAt: 1 });
AnnouncementSchema.index({ type: 1, priority: 1, status: 1 });
