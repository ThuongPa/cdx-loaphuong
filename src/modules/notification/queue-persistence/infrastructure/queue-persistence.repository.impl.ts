import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QueueOperation } from '../domain/queue-operation.entity';
import { QueuePersistenceRepository } from './queue-persistence.repository';
import { QueueOperationFilters } from '../application/services/queue-persistence.service';
import { QueueOperationDocument, QueueOperationSchema } from '../queue-persistence.schema';

@Injectable()
export class QueuePersistenceRepositoryImpl implements QueuePersistenceRepository {
  constructor(
    @InjectModel('QueueOperation') private queueOperationModel: Model<QueueOperationDocument>,
  ) {}

  async create(queueOperation: QueueOperation): Promise<QueueOperation> {
    const queueOperationData = queueOperation.toPersistence();
    const created = await this.queueOperationModel.create(queueOperationData);
    return QueueOperation.fromPersistence(created);
  }

  async findById(id: string): Promise<QueueOperation | null> {
    const queueOperation = await this.queueOperationModel.findById(id).exec();
    return queueOperation ? QueueOperation.fromPersistence(queueOperation) : null;
  }

  async findByOperationId(operationId: string): Promise<QueueOperation | null> {
    const queueOperation = await this.queueOperationModel.findOne({ operationId }).exec();
    return queueOperation ? QueueOperation.fromPersistence(queueOperation) : null;
  }

  async find(filters: QueueOperationFilters): Promise<{
    queueOperations: QueueOperation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (filters.queueNames && filters.queueNames.length > 0) {
      query.queueName = { $in: filters.queueNames };
    }

    if (filters.operationTypes && filters.operationTypes.length > 0) {
      query.operationType = { $in: filters.operationTypes };
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query.status = { $in: filters.statuses };
    }

    if (filters.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end,
      };
    }

    const limit = filters.limit || 10;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    const [queueOperations, total] = await Promise.all([
      this.queueOperationModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
      this.queueOperationModel.countDocuments(query),
    ]);

    return {
      queueOperations: queueOperations.map((qo) => QueueOperation.fromPersistence(qo)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, queueOperation: QueueOperation): Promise<QueueOperation> {
    const queueOperationData = queueOperation.toPersistence();
    const updated = await this.queueOperationModel
      .findByIdAndUpdate(id, queueOperationData, { new: true })
      .exec();
    return updated ? QueueOperation.fromPersistence(updated) : queueOperation;
  }

  async delete(id: string): Promise<void> {
    await this.queueOperationModel.findByIdAndDelete(id).exec();
  }

  async findByStatus(status: string): Promise<QueueOperation[]> {
    const queueOperations = await this.queueOperationModel
      .find({ status })
      .sort({ createdAt: -1 })
      .exec();

    return queueOperations.map((qo) => QueueOperation.fromPersistence(qo));
  }

  async findFailedForRetry(): Promise<QueueOperation[]> {
    const queueOperations = await this.queueOperationModel
      .find({
        status: 'error',
        retryCount: { $lt: { $expr: '$maxRetries' } },
        $or: [{ nextRetryAt: { $lte: new Date() } }, { nextRetryAt: { $exists: false } }],
      })
      .sort({ createdAt: -1 })
      .exec();

    return queueOperations.map((qo) => QueueOperation.fromPersistence(qo));
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    paused: number;
    draining: number;
    maintenance: number;
    error: number;
    byOperationType: Record<string, number>;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  }> {
    const stats = await this.queueOperationModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          paused: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
          draining: { $sum: { $cond: [{ $eq: ['$status', 'draining'] }, 1, 0] } },
          maintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } },
          error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          byOperationType: {
            $push: {
              operationType: '$operationType',
              status: '$status',
            },
          },
          averageProcessingTime: { $avg: '$result.duration' },
          successCount: { $sum: { $cond: [{ $eq: ['$result.success', true] }, 1, 0] } },
          failureCount: { $sum: { $cond: [{ $eq: ['$result.success', false] }, 1, 0] } },
        },
      },
    ]);

    const result = stats[0] || {
      total: 0,
      active: 0,
      paused: 0,
      draining: 0,
      maintenance: 0,
      error: 0,
      byOperationType: [],
      averageProcessingTime: 0,
      successCount: 0,
      failureCount: 0,
    };

    const byOperationType: Record<string, number> = {};
    if (result.byOperationType) {
      result.byOperationType.forEach((item: any) => {
        byOperationType[item.operationType] = (byOperationType[item.operationType] || 0) + 1;
      });
    }

    const successRate = result.total > 0 ? result.successCount / result.total : 0;
    const errorRate = result.total > 0 ? result.failureCount / result.total : 0;

    return {
      total: result.total,
      active: result.active,
      paused: result.paused,
      draining: result.draining,
      maintenance: result.maintenance,
      error: result.error,
      byOperationType,
      averageProcessingTime: result.averageProcessingTime || 0,
      successRate,
      errorRate,
    };
  }

  async bulkUpdateStatus(
    operationIds: string[],
    status: string,
    metadata?: Record<string, any>,
  ): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const operationId of operationIds) {
      try {
        await this.queueOperationModel.findByIdAndUpdate(operationId, {
          status,
          metadata: metadata || {},
          updatedAt: new Date(),
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    return { successCount, errorCount };
  }

  async cleanupOld(cutoffDate: Date): Promise<{ deletedCount: number }> {
    const result = await this.queueOperationModel
      .deleteMany({
        status: { $in: ['active', 'completed'] },
        createdAt: { $lt: cutoffDate },
      })
      .exec();

    return { deletedCount: result.deletedCount || 0 };
  }

  async getHealthStatus(queueName: string): Promise<{
    isHealthy: boolean;
    status: string;
    metrics: {
      totalOperations: number;
      activeOperations: number;
      failedOperations: number;
      averageProcessingTime: number;
      successRate: number;
    };
  }> {
    const stats = await this.queueOperationModel.aggregate([
      { $match: { queueName } },
      {
        $group: {
          _id: null,
          totalOperations: { $sum: 1 },
          activeOperations: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          failedOperations: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          averageProcessingTime: { $avg: '$result.duration' },
          successCount: { $sum: { $cond: [{ $eq: ['$result.success', true] }, 1, 0] } },
        },
      },
    ]);

    const result = stats[0] || {
      totalOperations: 0,
      activeOperations: 0,
      failedOperations: 0,
      averageProcessingTime: 0,
      successCount: 0,
    };

    const successRate =
      result.totalOperations > 0 ? result.successCount / result.totalOperations : 0;
    const isHealthy = result.failedOperations < result.totalOperations * 0.1; // Less than 10% failure rate

    return {
      isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      metrics: {
        totalOperations: result.totalOperations,
        activeOperations: result.activeOperations,
        failedOperations: result.failedOperations,
        averageProcessingTime: result.averageProcessingTime || 0,
        successRate,
      },
    };
  }
}
