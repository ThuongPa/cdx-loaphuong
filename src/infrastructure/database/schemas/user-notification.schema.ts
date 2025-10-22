import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationStatus } from '../../../common/enums/notification-status.enum';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../../common/types/notification.types';

export type UserNotificationDocument = UserNotification & Document;

@Schema({ timestamps: true })
export class UserNotification {
  @Prop({ required: true, unique: true })
  id: string; // CUID

  @Prop({ required: true })
  _id: string; // CUID

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  notificationId: string;

  @Prop({ required: true, enum: Object.values(NotificationType) })
  type: NotificationType;

  @Prop({ required: true, enum: Object.values(NotificationChannel) })
  channel: NotificationChannel;

  @Prop({ required: true, enum: Object.values(NotificationPriority) })
  priority: NotificationPriority;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;

  @Prop({ enum: Object.values(NotificationStatus), default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: String })
  errorCode?: string;

  @Prop({ type: Number, default: 0 })
  retryCount: number;

  @Prop({ type: String })
  deliveryId?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const UserNotificationSchema = SchemaFactory.createForClass(UserNotification);
