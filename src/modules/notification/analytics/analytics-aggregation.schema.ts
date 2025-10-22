import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Type } from 'class-transformer';

export type AnalyticsAggregationDocument = AnalyticsAggregation & Document;

export enum AggregationPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Schema({ timestamps: true })
export class AnalyticsAggregation {
  @Prop({ required: true })
  metricName: string;

  @Prop({ required: true, enum: AggregationPeriod })
  period: AggregationPeriod;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  totalValue: number;

  @Prop({ required: true })
  count: number;

  @Prop({ required: true })
  averageValue: number;

  @Prop({ required: true })
  minValue: number;

  @Prop({ required: true })
  maxValue: number;

  @Prop({ type: Object, default: {} })
  dimensions: {
    channel?: string;
    category?: string;
    priority?: string;
    templateId?: string;
    campaignId?: string;
    deviceType?: string;
    userSegment?: string;
    [key: string]: any;
  };

  @Prop({ type: Object, default: {} })
  breakdown: {
    byChannel?: Record<string, number>;
    byCategory?: Record<string, number>;
    byPriority?: Record<string, number>;
    byDeviceType?: Record<string, number>;
    byUserSegment?: Record<string, number>;
    byHour?: Record<string, number>;
    byDay?: Record<string, number>;
    [key: string]: any;
  };

  @Prop({ type: Object, default: {} })
  trends: {
    previousPeriodValue?: number;
    changePercentage?: number;
    trendDirection?: 'up' | 'down' | 'stable';
    volatility?: number;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const AnalyticsAggregationSchema = SchemaFactory.createForClass(AnalyticsAggregation);

// Indexes for efficient querying
AnalyticsAggregationSchema.index({ metricName: 1, period: 1, startDate: 1 });
AnalyticsAggregationSchema.index({ period: 1, startDate: 1, endDate: 1 });
AnalyticsAggregationSchema.index({ 'dimensions.channel': 1, period: 1 });
AnalyticsAggregationSchema.index({ 'dimensions.category': 1, period: 1 });
