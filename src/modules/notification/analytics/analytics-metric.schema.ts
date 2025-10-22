import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AnalyticsMetricType } from './domain/analytics.entity';

export type AnalyticsMetricDocument = AnalyticsMetric & Document;

@Schema({ timestamps: true })
export class AnalyticsMetric {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: Object.values(AnalyticsMetricType) })
  type: AnalyticsMetricType;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const AnalyticsMetricSchema = SchemaFactory.createForClass(AnalyticsMetric);
