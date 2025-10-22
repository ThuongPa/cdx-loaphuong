import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ThrottlingRuleDocument = ThrottlingRule & Document;
export type UserThrottlingProfileDocument = UserThrottlingProfile & Document;
export type ThrottlingStatisticsDocument = ThrottlingStatistics & Document;
export type ThrottlingRecordDocument = ThrottlingRecord & Document;

export enum ThrottlingType {
  RATE_LIMIT = 'rate_limit',
  BURST_LIMIT = 'burst_limit',
  COOLDOWN = 'cooldown',
  DAILY_LIMIT = 'daily_limit',
  HOURLY_LIMIT = 'hourly_limit',
}

export enum ThrottlingScope {
  GLOBAL = 'global',
  USER = 'user',
  CHANNEL = 'channel',
  CATEGORY = 'category',
  SEGMENT = 'segment',
}

export enum ThrottlingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class ThrottlingRule {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ enum: ThrottlingType, required: true })
  type: ThrottlingType;

  @Prop({ enum: ThrottlingScope, required: true })
  scope: ThrottlingScope;

  @Prop({ type: Object, required: true })
  limits: {
    maxNotifications: number;
    timeWindowMs: number;
    burstLimit?: number;
    burstWindowMs?: number;
    cooldownMs?: number;
  };

  @Prop({ type: Object })
  conditions?: {
    channels?: string[];
    categories?: string[];
    priorities?: string[];
    userSegments?: string[];
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      timezone?: string;
      daysOfWeek?: number[];
    };
    customRules?: Record<string, any>;
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  createdBy: string;
}

@Schema({ timestamps: true })
export class UserThrottlingProfile {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: 100 })
  maxNotificationsPerHour: number;

  @Prop({ default: 1000 })
  maxNotificationsPerDay: number;

  @Prop({ default: false })
  isThrottled: boolean;

  @Prop({ type: Object })
  customRules?: Record<string, any>;

  @Prop()
  lastThrottledAt?: Date;

  @Prop()
  throttleReason?: string;
}

@Schema({ timestamps: true })
export class ThrottlingRecord {
  @Prop({ required: true })
  ruleId: string;

  @Prop({ required: true })
  identifier: string;

  @Prop({ type: Object, required: true })
  counters: {
    timeWindowStart: Date;
    totalNotifications: number;
    lastNotificationAt: Date;
    burstWindowStart?: Date;
    burstCount?: number;
    cooldownUntil?: Date;
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class ThrottlingStatistics {
  @Prop({ required: true })
  ruleId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ default: 0 })
  totalNotifications: number;

  @Prop({ default: 0 })
  throttledNotifications: number;

  @Prop({ default: 0 })
  throttledCount: number;

  @Prop()
  lastThrottledAt?: Date;

  @Prop({ type: Object })
  metrics?: Record<string, any>;
}

export const ThrottlingRuleSchema = SchemaFactory.createForClass(ThrottlingRule);
export const UserThrottlingProfileSchema = SchemaFactory.createForClass(UserThrottlingProfile);
export const ThrottlingStatisticsSchema = SchemaFactory.createForClass(ThrottlingStatistics);
export const ThrottlingRecordSchema = SchemaFactory.createForClass(ThrottlingRecord);
