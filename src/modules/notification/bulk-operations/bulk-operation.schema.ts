import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BulkOperationDocument = BulkOperation & Document;

export enum BulkOperationType {
  BULK_SEND = 'bulk_send',
  BULK_UPDATE = 'bulk_update',
  BULK_DELETE = 'bulk_delete',
  BULK_EXPORT = 'bulk_export',
  BULK_IMPORT = 'bulk_import',
  BULK_SYNC = 'bulk_sync',
  BULK_RETRY = 'bulk_retry',
  BULK_CANCEL = 'bulk_cancel',
}

export enum BulkOperationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class BulkOperation {
  @Prop({ required: true })
  operationId: string;

  @Prop({ required: true, enum: BulkOperationType })
  operationType: BulkOperationType;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: BulkOperationStatus, default: BulkOperationStatus.PENDING })
  status: BulkOperationStatus;

  @Prop({ required: true, type: Object })
  progress: {
    total: number;
    processed: number;
    failed: number;
    skipped: number;
    percentage: number;
  };

  @Prop({ required: true, type: Object })
  filters: Record<string, any>;

  @Prop({ type: Object })
  options?: {
    batchSize?: number;
    concurrency?: number;
    retryAttempts?: number;
    timeout?: number;
    dryRun?: boolean;
  };

  @Prop({ type: Object })
  result?: {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
    timestamp: Date;
  };

  @Prop()
  errorMessage?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  updatedBy?: string;
}

export const BulkOperationSchema = SchemaFactory.createForClass(BulkOperation);
