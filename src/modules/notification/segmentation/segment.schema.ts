import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SegmentDocument = Segment & Document;

@Schema({ timestamps: true })
export class Segment {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [Object], default: [] })
  criteria: Array<{
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

export const SegmentSchema = SchemaFactory.createForClass(Segment);
