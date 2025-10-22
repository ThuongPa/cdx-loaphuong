import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FallbackStrategyDocument = FallbackStrategy & Document;

@Schema({ timestamps: true })
export class FallbackStrategy {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  priority: number;

  @Prop({ type: [Object], default: [] })
  conditions: Array<{
    type: string;
    operator: string;
    value: any;
    field?: string;
  }>;

  @Prop({ type: [Object], default: [] })
  actions: Array<{
    type: string;
    config: Record<string, any>;
    delay?: number;
    maxAttempts?: number;
  }>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true })
  createdBy: string;
}

export const FallbackStrategySchema = SchemaFactory.createForClass(FallbackStrategy);
