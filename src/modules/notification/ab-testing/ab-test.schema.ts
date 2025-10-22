import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AbTestStatus, AbTestType, VariationType } from './domain/ab-test.entity';

export type AbTestDocument = AbTest & Document;

// Re-export enums for backward compatibility
export { AbTestStatus, AbTestType, VariationType };

@Schema({ timestamps: true })
export class AbTest {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: AbTestType })
  testType: AbTestType;

  @Prop({ required: true, enum: AbTestStatus, default: AbTestStatus.DRAFT })
  status: AbTestStatus;

  @Prop({ required: true, type: Object })
  targetAudience: {
    userSegments?: string[];
    categories?: string[];
    channels?: string[];
    userAttributes?: Record<string, any>;
    exclusionCriteria?: Record<string, any>;
  };

  @Prop({ required: true, type: [Object] })
  variations: Array<{
    id: string;
    name: string;
    type?: VariationType;
    content: {
      subject?: string;
      body?: string;
      templateId?: string;
      channel?: string;
      deliveryTime?: string;
      callToAction?: string;
      metadata?: Record<string, any>;
    };
    weight?: number; // Traffic allocation percentage
    isControl: boolean;
  }>;

  @Prop({ required: true, type: Object })
  trafficAllocation: {
    control: number; // Percentage for control group
    variants: Array<{
      variationId: string;
      percentage: number;
    }>;
  };

  @Prop({ required: true, type: [Object] })
  successMetrics: Array<{
    name: string;
    type: 'conversion' | 'engagement' | 'delivery' | 'click' | 'custom';
    targetValue?: number;
    isPrimary: boolean;
  }>;

  @Prop({ required: true, type: Object })
  duration: {
    startDate: Date;
    endDate: Date;
    minDuration?: number; // Minimum days to run
    maxDuration?: number; // Maximum days to run
  };

  @Prop({ required: true, type: Object })
  statisticalSettings: {
    confidenceLevel: number; // e.g., 95%
    minimumSampleSize: number;
    significanceThreshold: number; // e.g., 0.05
    maxParticipants?: number;
  };

  @Prop({ type: Object, default: {} })
  results: {
    totalParticipants: number;
    controlGroup: {
      participants: number;
      conversions: number;
      conversionRate: number;
      metrics: Record<string, number>;
    };
    variants: Array<{
      variationId: string;
      participants: number;
      conversions: number;
      conversionRate: number;
      metrics: Record<string, number>;
      significance: number;
      confidenceInterval: {
        lower: number;
        upper: number;
      };
      isWinner: boolean;
    }>;
    statisticalSignificance: boolean;
    winner?: string;
    confidenceLevel: number;
    pValue: number;
  };

  @Prop({ type: Object, default: {} })
  settings: {
    autoStopOnSignificance?: boolean;
    autoStopOnMaxDuration?: boolean;
    notifyOnCompletion?: boolean;
    notifyOnSignificance?: boolean;
    customRules?: Record<string, any>;
  };

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  updatedBy?: string;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop()
  startedBy?: string;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop()
  stoppedBy?: string;

  @Prop({ type: Date })
  pausedAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: Object, default: {} })
  metadata: {
    tags?: string[];
    priority?: number;
    category?: string;
    [key: string]: any;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const AbTestSchema = SchemaFactory.createForClass(AbTest);

// Indexes for efficient querying
AbTestSchema.index({ status: 1, testType: 1 });
AbTestSchema.index({ 'duration.startDate': 1, 'duration.endDate': 1 });
AbTestSchema.index({ createdBy: 1, status: 1 });
AbTestSchema.index({ 'targetAudience.userSegments': 1 });
AbTestSchema.index({ 'targetAudience.categories': 1 });
AbTestSchema.index({ 'targetAudience.channels': 1 });
