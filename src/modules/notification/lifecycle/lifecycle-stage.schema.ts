import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LifecycleStageDocument = LifecycleStage & Document;

@Schema({ timestamps: true })
export class LifecycleStage {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  type: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  order: number;

  @Prop({ type: [Object], default: [] })
  triggers: Array<{
    type: string;
    config: Record<string, any>;
    delay?: number;
    repeatable?: boolean;
  }>;

  @Prop({ type: [Object], default: [] })
  actions: Array<{
    type: string;
    config: Record<string, any>;
    delay?: number;
    priority?: number;
  }>;

  @Prop({ type: [Object], default: [] })
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
    logic?: string;
  }>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true })
  createdBy: string;
}

export const LifecycleStageSchema = SchemaFactory.createForClass(LifecycleStage);
