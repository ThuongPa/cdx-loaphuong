import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ThrottleRuleDocument = ThrottleRule & Document;

@Schema({ timestamps: true })
export class ThrottleRule {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  type: string;

  @Prop({ type: [Object], default: [] })
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
    logic?: string;
  }>;

  @Prop({ type: [Object], default: [] })
  limits: Array<{
    window: number;
    maxCount: number;
    scope: string;
    action: string;
  }>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true })
  createdBy: string;
}

export const ThrottleRuleSchema = SchemaFactory.createForClass(ThrottleRule);
