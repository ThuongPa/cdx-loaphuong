import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ScheduledNotificationDocument = ScheduledNotification & Document;

export enum ScheduleStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class ScheduledNotification {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Object, required: true })
  schedulePattern: {
    type: 'once' | 'recurring' | 'cron';
    cronExpression?: string;
    recurringType?: 'daily' | 'weekly' | 'monthly';
    recurringDays?: number[];
    recurringDayOfMonth?: number;
    timezone: string;
    scheduledAt?: Date;
  };

  @Prop({ type: Object, required: true })
  notificationContent: {
    title: string;
    body: string;
    data?: Record<string, any>;
    categoryId?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    channels?: string[];
  };

  @Prop({ type: Object, required: true })
  targetAudience: {
    userIds?: string[];
    categoryIds?: string[];
    userSegments?: string[];
    excludeUserIds?: string[];
  };

  @Prop({ type: String, enum: ScheduleStatus, default: ScheduleStatus.PENDING })
  status: ScheduleStatus;

  @Prop({ type: Date })
  scheduledAt: Date;

  @Prop({ type: Date })
  lastExecutedAt?: Date;

  @Prop({ type: Date })
  nextExecutionAt?: Date;

  @Prop({ default: 0 })
  executionCount: number;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  failureCount: number;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String })
  createdBy: string;

  @Prop({ type: String })
  updatedBy?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ScheduledNotificationSchema = SchemaFactory.createForClass(ScheduledNotification);
