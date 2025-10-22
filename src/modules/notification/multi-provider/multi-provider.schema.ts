import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MultiProviderDocument = MultiProvider & Document;

@Schema({ timestamps: true })
export class MultiProvider {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop({ type: Object, required: true })
  config: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  priority: number;

  @Prop({ type: [String], default: [] })
  fallbackProviders: string[];

  @Prop({ type: Object })
  rateLimit?: {
    requests: number;
    window: number;
  };

  @Prop({ type: Object })
  retryConfig?: {
    maxRetries: number;
    backoffStrategy: string;
    baseDelay: number;
  };

  @Prop({ type: Object })
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoint?: string;
  };

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const MultiProviderSchema = SchemaFactory.createForClass(MultiProvider);
