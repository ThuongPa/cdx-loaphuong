import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LifecycleStage {
  CREATED = 'created',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  CLICKED = 'clicked',
  DISMISSED = 'dismissed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum RetentionPolicy {
  IMMEDIATE = 'immediate',
  AFTER_READ = 'after_read',
  AFTER_DELIVERED = 'after_delivered',
  CUSTOM = 'custom',
  NEVER = 'never',
}

export enum ArchivalStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  RESTORED = 'restored',
  DELETED = 'deleted',
}

export type NotificationLifecycleDocument = NotificationLifecycle & Document;
export type LifecyclePolicyDocument = LifecyclePolicy & Document;
export type LifecycleExecutionDocument = LifecycleExecution & Document;
export type DataRetentionRuleDocument = DataRetentionRule & Document;
export type LifecycleStatisticsDocument = LifecycleStatistics & Document;

@Schema({ timestamps: true })
export class NotificationLifecycle {
  @Prop({ required: true })
  notificationId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: LifecycleStage })
  currentStage: LifecycleStage;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Object })
  policy?: {
    policy: RetentionPolicy;
    retentionDays?: number;
    archivalDays?: number;
    deletionDays?: number;
  };

  @Prop({ default: Date.now })
  stageChangedAt: Date;

  @Prop({ type: Object })
  stageHistory?: {
    stage: LifecycleStage;
    timestamp: Date;
    metadata?: Record<string, any>;
  }[];

  @Prop({ enum: ArchivalStatus, default: ArchivalStatus.ACTIVE })
  archivalStatus: ArchivalStatus;

  @Prop()
  archivedAt?: Date;

  @Prop()
  deletedAt?: Date;

  @Prop({ default: Date.now })
  lastActivityAt: Date;

  @Prop({ type: Object })
  analytics?: {
    engagementScore: number;
    deliveryTime: number;
    readTime?: number;
    clickTime?: number;
  };
}

@Schema({ timestamps: true })
export class LifecyclePolicy {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: RetentionPolicy })
  retentionPolicy: RetentionPolicy;

  @Prop({ type: Object })
  actions: {
    archive?: {
      enabled: boolean;
      afterDays?: number;
      conditions?: Record<string, any>;
    };
    delete?: {
      enabled: boolean;
      afterDays?: number;
      conditions?: Record<string, any>;
    };
    notify?: {
      enabled: boolean;
      beforeDays?: number;
      channels?: string[];
    };
  };

  @Prop({ type: Object })
  conditions?: {
    stages?: LifecycleStage[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    userSegments?: string[];
    notificationTypes?: string[];
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  updatedBy?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class LifecycleExecution {
  @Prop({ required: true })
  executionId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'LifecyclePolicy' })
  policyId: Types.ObjectId;

  @Prop({ required: true })
  triggerType: string;

  @Prop({ required: true, type: Object })
  scope: {
    notificationIds?: string[];
    userIds?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    stages?: LifecycleStage[];
  };

  @Prop({ required: true, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' })
  status: string;

  @Prop({ type: Object })
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    percentage: number;
  };

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  result?: {
    notificationsProcessed: number;
    notificationsArchived: number;
    notificationsDeleted: number;
    errors: string[];
  };

  @Prop({ required: true })
  executedBy: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class DataRetentionRule {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: RetentionPolicy })
  policy: RetentionPolicy;

  @Prop({ type: Object })
  conditions: {
    stages?: LifecycleStage[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    userSegments?: string[];
    notificationTypes?: string[];
    ageThreshold?: number;
  };

  @Prop({ type: Object })
  actions: {
    archive?: {
      enabled: boolean;
      afterDays?: number;
    };
    delete?: {
      enabled: boolean;
      afterDays?: number;
    };
    anonymize?: {
      enabled: boolean;
      fields?: string[];
    };
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  updatedBy?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class LifecycleStatistics {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, type: Object })
  global: {
    totalNotifications: number;
    byStage: Record<LifecycleStage, number>;
    byRetention: Record<RetentionPolicy, number>;
    averageEngagement: number;
    averageDeliveryTime: number;
  };

  @Prop({ required: true, type: Object })
  byUser: {
    totalUsers: number;
    activeUsers: number;
    averageNotificationsPerUser: number;
    engagementDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  };

  @Prop({ required: true, type: Object })
  byNotificationType: {
    totalTypes: number;
    typeDistribution: Record<string, number>;
    averageEngagementByType: Record<string, number>;
  };

  @Prop({ required: true, type: Object })
  retention: {
    totalArchived: number;
    totalDeleted: number;
    averageRetentionDays: number;
    complianceRate: number;
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const NotificationLifecycleSchema = SchemaFactory.createForClass(NotificationLifecycle);
export const LifecyclePolicySchema = SchemaFactory.createForClass(LifecyclePolicy);
export const LifecycleExecutionSchema = SchemaFactory.createForClass(LifecycleExecution);
export const DataRetentionRuleSchema = SchemaFactory.createForClass(DataRetentionRule);
export const LifecycleStatisticsSchema = SchemaFactory.createForClass(LifecycleStatistics);
