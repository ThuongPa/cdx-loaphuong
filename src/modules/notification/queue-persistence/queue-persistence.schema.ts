import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QueueOperationDocument = QueueOperation & Document;

export enum QueueOperationType {
  ENQUEUE = 'enqueue',
  DEQUEUE = 'dequeue',
  PEEK = 'peek',
  CLEAR = 'clear',
  PAUSE = 'pause',
  RESUME = 'resume',
  PRIORITIZE = 'prioritize',
  BULK_OPERATION = 'bulk_operation',
  MIGRATE = 'migrate',
  BACKUP = 'backup',
  RESTORE = 'restore',
}

export enum QueueStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DRAINING = 'draining',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
}

@Schema({ timestamps: true })
export class QueueOperation {
  @Prop({ required: true })
  operationId: string;

  @Prop({ required: true, enum: QueueOperationType })
  operationType: QueueOperationType;

  @Prop({ required: true })
  queueName: string;

  @Prop({ required: true, type: Object })
  payload: {
    data: any;
    metadata?: Record<string, any>;
    priority?: number;
    delay?: number;
    ttl?: number;
    retryCount?: number;
    maxRetries?: number;
  };

  @Prop({ required: true, enum: QueueStatus, default: QueueStatus.ACTIVE })
  status: QueueStatus;

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

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 3 })
  maxRetries: number;

  @Prop()
  nextRetryAt?: Date;

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

export const QueueOperationSchema = SchemaFactory.createForClass(QueueOperation);
