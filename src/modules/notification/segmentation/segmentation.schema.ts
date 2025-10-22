import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SegmentationType {
  DEMOGRAPHIC = 'demographic',
  BEHAVIORAL = 'behavioral',
  GEOGRAPHIC = 'geographic',
  PSYCHOGRAPHIC = 'psychographic',
  TECHNOLOGICAL = 'technological',
  CUSTOM = 'custom',
}

export enum SegmentationStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum TargetingRuleType {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  IN = 'in',
  NOT_IN = 'not_in',
  REGEX = 'regex',
  DATE_RANGE = 'date_range',
  TIME_RANGE = 'time_range',
}

export type UserSegmentDocument = UserSegment & Document;
export type SegmentMemberDocument = SegmentMember & Document;
export type TargetingRuleDocument = TargetingRule & Document;
export type UserBehaviorProfileDocument = UserBehaviorProfile & Document;
export type SegmentationStatisticsDocument = SegmentationStatistics & Document;

@Schema({ timestamps: true })
export class UserSegment {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: SegmentationType })
  type: SegmentationType;

  @Prop({ type: Object })
  criteria: Record<string, any>;

  @Prop({ type: Object })
  targeting?: Record<string, any>;

  @Prop({ enum: SegmentationStatus, default: SegmentationStatus.DRAFT })
  status: SegmentationStatus;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  updatedBy?: string;

  @Prop({ default: 0 })
  memberCount: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class SegmentMember {
  @Prop({ type: Types.ObjectId, ref: 'UserSegment', required: true })
  segmentId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  joinedAt: Date;

  @Prop()
  leftAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class TargetingRule {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  segmentId: string;

  @Prop({ type: Object, required: true })
  conditions: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class UserBehaviorProfile {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: Object })
  preferences: Record<string, any>;

  @Prop({ type: Object })
  activity: Record<string, any>;

  @Prop({ type: Object })
  engagement: Record<string, any>;

  @Prop({ type: Object })
  demographics: Record<string, any>;

  @Prop({ type: Object })
  behavior?: Record<string, any>;

  @Prop({ type: Object })
  scores?: Record<string, any>;

  @Prop({ type: Object })
  segments?: Record<string, any>;

  @Prop({ default: Date.now })
  lastUpdated: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class SegmentationStatistics {
  @Prop({ required: true })
  segmentId: string;

  @Prop({ default: 0 })
  totalMembers: number;

  @Prop({ default: 0 })
  activeMembers: number;

  @Prop({ default: 0 })
  engagementRate: number;

  @Prop({ type: Object })
  demographics?: Record<string, any>;

  @Prop({ type: Object })
  behavior?: Record<string, any>;

  @Prop({ default: Date.now })
  lastCalculated: Date;
}

export const UserSegmentSchema = SchemaFactory.createForClass(UserSegment);
export const SegmentMemberSchema = SchemaFactory.createForClass(SegmentMember);
export const TargetingRuleSchema = SchemaFactory.createForClass(TargetingRule);
export const UserBehaviorProfileSchema = SchemaFactory.createForClass(UserBehaviorProfile);
export const SegmentationStatisticsSchema = SchemaFactory.createForClass(SegmentationStatistics);
