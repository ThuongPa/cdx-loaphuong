import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Type } from 'class-transformer';

export type AnalyticsDocument = Analytics & Document;

export enum AnalyticsEventType {
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_READ = 'notification.read',
  NOTIFICATION_CLICKED = 'notification.clicked',
  NOTIFICATION_DISMISSED = 'notification.dismissed',
  NOTIFICATION_FAILED = 'notification.failed',
  NOTIFICATION_BOUNCED = 'notification.bounced',
  USER_ENGAGEMENT = 'user.engagement',
  CHANNEL_PERFORMANCE = 'channel.performance',
  CAMPAIGN_PERFORMANCE = 'campaign.performance',
}

export enum AnalyticsMetricType {
  COUNT = 'count',
  RATE = 'rate',
  DURATION = 'duration',
  CONVERSION = 'conversion',
  ENGAGEMENT = 'engagement',
}

@Schema({ timestamps: true })
export class Analytics {
  @Prop({ required: true, enum: AnalyticsEventType })
  eventType: AnalyticsEventType;

  @Prop({ required: true, enum: AnalyticsMetricType })
  metricType: AnalyticsMetricType;

  @Prop({ required: true })
  metricName: string;

  @Prop({ required: true })
  value: number;

  @Prop({ type: Object, default: {} })
  dimensions: {
    userId?: string;
    notificationId?: string;
    channel?: string;
    category?: string;
    priority?: string;
    templateId?: string;
    campaignId?: string;
    deviceType?: string;
    userSegment?: string;
    timezone?: string;
    [key: string]: any;
  };

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ type: Date })
  date: Date;

  @Prop({ type: String })
  hour: string;

  @Prop({ type: String })
  day: string;

  @Prop({ type: String })
  week: string;

  @Prop({ type: String })
  month: string;

  @Prop({ type: String })
  year: string;

  @Prop({ type: Object, default: {} })
  metadata: {
    source?: string;
    version?: string;
    environment?: string;
    [key: string]: any;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const AnalyticsSchema = SchemaFactory.createForClass(Analytics);

// Indexes for efficient querying
AnalyticsSchema.index({ eventType: 1, timestamp: 1 });
AnalyticsSchema.index({ metricName: 1, timestamp: 1 });
AnalyticsSchema.index({ 'dimensions.userId': 1, timestamp: 1 });
AnalyticsSchema.index({ 'dimensions.channel': 1, timestamp: 1 });
AnalyticsSchema.index({ 'dimensions.category': 1, timestamp: 1 });
AnalyticsSchema.index({ date: 1, hour: 1 });
AnalyticsSchema.index({ date: 1, day: 1 });
AnalyticsSchema.index({ date: 1, week: 1 });
AnalyticsSchema.index({ date: 1, month: 1 });
AnalyticsSchema.index({ date: 1, year: 1 });
