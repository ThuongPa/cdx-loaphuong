import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ParticipantStatus } from './domain/ab-test-participant.entity';

export type AbTestParticipantDocument = AbTestParticipant & Document;

// Re-export enum for backward compatibility
export { ParticipantStatus };

@Schema({ timestamps: true })
export class AbTestParticipant {
  @Prop({ required: true, type: Types.ObjectId, ref: 'AbTest' })
  testId: Types.ObjectId;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  variationId: string;

  @Prop({ required: true, enum: ParticipantStatus, default: ParticipantStatus.ENROLLED })
  status: ParticipantStatus;

  @Prop({ required: true, type: Object })
  assignment: {
    method: 'random' | 'weighted' | 'manual';
    timestamp: Date;
    assignedBy?: string;
    reason?: string;
  };

  @Prop({ required: true, type: Object })
  exposure: {
    timestamp: Date;
    channel: string;
    notificationId?: string;
    templateId?: string;
    content: Record<string, any>;
  };

  @Prop({ type: [Object], default: [] })
  interactions: Array<{
    type: 'delivered' | 'opened' | 'clicked' | 'converted' | 'dismissed' | 'bounced';
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;

  @Prop({ type: [Object], default: [] })
  conversions: Array<{
    metricName: string;
    value: number;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;

  @Prop({ type: Object, default: {} })
  attributes: {
    userSegment?: string;
    category?: string;
    channel?: string;
    deviceType?: string;
    timezone?: string;
    [key: string]: any;
  };

  @Prop({ type: Date })
  enrolledAt: Date;

  @Prop({ type: Date })
  exposedAt?: Date;

  @Prop({ type: Date })
  convertedAt?: Date;

  @Prop({ type: Date })
  droppedAt?: Date;

  @Prop({ type: Object, default: {} })
  metadata: {
    source?: string;
    campaignId?: string;
    [key: string]: any;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const AbTestParticipantSchema = SchemaFactory.createForClass(AbTestParticipant);

// Indexes for efficient querying
AbTestParticipantSchema.index({ testId: 1, userId: 1 }, { unique: true });
AbTestParticipantSchema.index({ testId: 1, variationId: 1 });
AbTestParticipantSchema.index({ testId: 1, status: 1 });
AbTestParticipantSchema.index({ userId: 1, status: 1 });
AbTestParticipantSchema.index({ 'assignment.timestamp': 1 });
AbTestParticipantSchema.index({ 'exposure.timestamp': 1 });
