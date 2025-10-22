import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserSyncDocument = UserSync & Document;

export enum SyncType {
  USER_UPDATE = 'user_update',
  PREFERENCES_UPDATE = 'preferences_update',
  DEVICE_UPDATE = 'device_update',
  USER_DELETE = 'user_delete',
  FULL_SYNC = 'full_sync',
  INCREMENTAL_SYNC = 'incremental_sync',
  REALTIME_SYNC = 'realtime_sync',
}

export enum SyncSource {
  API = 'api',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
  AUTH_SERVICE = 'auth_service',
  NOVU = 'novu',
  EXTERNAL_API = 'external_api',
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class UserSync {
  @Prop({ required: true })
  userId: string;

  @Prop({ enum: SyncType, required: true })
  type: SyncType;

  @Prop({ enum: SyncSource, required: true })
  source: SyncSource;

  @Prop({ enum: SyncStatus, default: SyncStatus.PENDING })
  status: SyncStatus;

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop()
  reason?: string;

  @Prop({ default: 1 })
  priority: number;

  @Prop({ default: false })
  isScheduled: boolean;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 3 })
  maxRetries: number;
}

export const UserSyncSchema = SchemaFactory.createForClass(UserSync);
