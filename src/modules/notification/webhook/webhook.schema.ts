import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebhookDocument = Webhook & Document;

@Schema({ timestamps: true })
export class Webhook {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  url: string;

  @Prop({ type: [String], required: true })
  events: string[];

  @Prop({ type: Object, default: {} })
  headers?: Record<string, string>;

  @Prop()
  secret?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 30000 })
  timeout: number;

  @Prop({ default: 3 })
  retryCount: number;

  @Prop({ default: 1000 })
  retryDelay: number;

  @Prop({ required: true })
  createdBy: string;
}

export const WebhookSchema = SchemaFactory.createForClass(Webhook);
