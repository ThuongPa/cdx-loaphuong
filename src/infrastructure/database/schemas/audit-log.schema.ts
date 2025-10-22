import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  _id: string; // Custom ID

  @Prop({ required: true })
  action: string; // e.g., 'BROADCAST_NOTIFICATION', 'MANUAL_RETRY', 'VIEW_STATISTICS'

  @Prop({ required: true })
  resource: string; // e.g., 'notification', 'user', 'system'

  @Prop()
  resourceId?: string; // ID of the resource being acted upon

  @Prop()
  userId?: string; // ID of the user performing the action

  @Prop()
  userEmail?: string; // Email of the user performing the action

  @Prop({ type: [String] })
  userRoles?: string[]; // Roles of the user performing the action

  @Prop()
  ipAddress?: string; // IP address of the client

  @Prop()
  userAgent?: string; // User agent string

  @Prop()
  requestId?: string; // Request ID for tracing

  @Prop({ type: Object })
  details?: Record<string, any>; // Additional details about the action

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes for performance
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

// TTL index for cleanup (1 year)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
