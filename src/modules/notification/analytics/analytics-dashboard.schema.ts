import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsDashboardDocument = AnalyticsDashboard & Document;

@Schema({ timestamps: true })
export class AnalyticsDashboard {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [Object], required: true })
  widgets: Array<{
    id: string;
    type: 'chart' | 'table' | 'metric' | 'kpi';
    title: string;
    config: Record<string, any>;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ required: true })
  createdBy: string;
}

export const AnalyticsDashboardSchema = SchemaFactory.createForClass(AnalyticsDashboard);
