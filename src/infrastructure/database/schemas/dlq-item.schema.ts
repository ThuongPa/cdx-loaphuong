import { Schema, Document, Types } from 'mongoose';
import { Type } from 'class-transformer';

export interface DLQItemDocument extends Document {
  originalMessage: any;
  error: string;
  retryCount: number;
  createdAt: Date;
  lastAttemptAt: Date;
}

export const DLQItemSchema = new Schema<DLQItemDocument>({
  originalMessage: { type: Schema.Types.Mixed, required: true },
  error: { type: String, required: true },
  retryCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastAttemptAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

DLQItemSchema.index({ createdAt: -1 });
DLQItemSchema.index({ retryCount: 1, createdAt: -1 });