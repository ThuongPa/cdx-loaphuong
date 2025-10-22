import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WebhookDeliveryDocument = WebhookDelivery & Document;

@Schema({ timestamps: true })
export class WebhookDelivery {
  @Prop({ type: Types.ObjectId, ref: 'Webhook', required: true })
  webhookId: string;

  @Prop({ required: true })
  eventType: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, any>;

  @Prop({ default: 'pending' })
  status: string;

  @Prop()
  responseCode?: number;

  @Prop()
  responseBody?: string;

  @Prop()
  deliveredAt?: Date;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: false })
  isSuccessful: boolean;

  @Prop()
  errorMessage?: string;
}

export const WebhookDeliverySchema = SchemaFactory.createForClass(WebhookDelivery);
