import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MonitoringMetricDocument = MonitoringMetric & Document;

@Schema({ timestamps: true })
export class MonitoringMetric {
  @Prop({ required: true })
  metricId: string;

  @Prop({ required: true })
  metricName: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: Object, default: {} })
  tags: Record<string, string>;

  @Prop({ default: 'active' })
  status: string;

  @Prop()
  description?: string;

  @Prop()
  unit?: string;

  @Prop()
  threshold?: number;

  @Prop()
  alertLevel?: string;
}

export const MonitoringMetricSchema = SchemaFactory.createForClass(MonitoringMetric);
