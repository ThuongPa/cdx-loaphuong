import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AnalyticsPeriod } from './domain/analytics.entity';

export type AnalyticsReportDocument = AnalyticsReport & Document;

@Schema({ timestamps: true })
export class AnalyticsReport {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], required: true })
  metrics: string[];

  @Prop({ type: Object, required: true })
  filters: {
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
    channels?: string[];
    userSegments?: string[];
    categories?: string[];
    templates?: string[];
  };

  @Prop({ required: true, enum: Object.values(AnalyticsPeriod) })
  period: AnalyticsPeriod;

  @Prop({ default: false })
  isScheduled: boolean;

  @Prop({ type: Object })
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
  };

  @Prop({ type: [String], required: true })
  recipients: string[];

  @Prop({ required: true })
  createdBy: string;
}

export const AnalyticsReportSchema = SchemaFactory.createForClass(AnalyticsReport);
