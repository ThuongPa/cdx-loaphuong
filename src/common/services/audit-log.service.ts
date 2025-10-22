import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../../infrastructure/database/schemas/audit-log.schema';
import { Injectable, Logger } from '@nestjs/common';
import { Type } from 'class-transformer';

export interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const auditLog = new this.auditLogModel({
        _id: this.generateId(),
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        userId: entry.userId,
        userEmail: entry.userEmail,
        userRoles: entry.userRoles,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        requestId: entry.requestId,
        details: entry.details,
        timestamp: entry.timestamp,
      });

      await auditLog.save();
    } catch (error) {
      // Log to application logs if database logging fails
      this.logger.error('Failed to save audit log', {
        error: error.message,
        entry,
      });
    }
  }

  async logAdminAction(
    action: string,
    resource: string,
    userId: string,
    userEmail: string,
    userRoles: string[],
    request: any,
    details?: Record<string, any>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      action,
      resource,
      userId,
      userEmail,
      userRoles,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      requestId: request.headers['x-request-id'],
      details,
      timestamp: new Date(),
    };

    await this.log(entry);
  }

  async getAuditLogs(
    filters: {
      action?: string;
      resource?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const query: any = {};

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.resource) {
      query.resource = filters.resource;
    }

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.auditLogModel.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean().exec(),
      this.auditLogModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIp(request: any): string {
    const forwarded = request.headers['x-forwarded-for'];
    return forwarded ? forwarded.split(',')[0] : request.connection.remoteAddress;
  }
}
