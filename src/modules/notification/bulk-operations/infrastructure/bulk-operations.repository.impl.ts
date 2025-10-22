import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BulkOperation } from '../domain/bulk-operation.entity';
import { BulkOperationsRepository } from './bulk-operations.repository';
import { BulkOperationFilters } from '../application/services/bulk-operations.service';
import { BulkOperationDocument, BulkOperationSchema } from '../bulk-operation.schema';

@Injectable()
export class BulkOperationsRepositoryImpl implements BulkOperationsRepository {
  constructor(
    @InjectModel('BulkOperation') private bulkOperationModel: Model<BulkOperationDocument>,
  ) {}

  async create(bulkOperation: BulkOperation): Promise<BulkOperation> {
    const bulkOperationData = bulkOperation.toPersistence();
    const created = await this.bulkOperationModel.create(bulkOperationData);
    return BulkOperation.fromPersistence(created);
  }

  async findById(id: string): Promise<BulkOperation | null> {
    const bulkOperation = await this.bulkOperationModel.findById(id).exec();
    return bulkOperation ? BulkOperation.fromPersistence(bulkOperation) : null;
  }

  async findByOperationId(operationId: string): Promise<BulkOperation | null> {
    const bulkOperation = await this.bulkOperationModel.findOne({ operationId }).exec();
    return bulkOperation ? BulkOperation.fromPersistence(bulkOperation) : null;
  }

  async find(filters: BulkOperationFilters): Promise<{
    bulkOperations: BulkOperation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (filters.operationTypes && filters.operationTypes.length > 0) {
      query.operationType = { $in: filters.operationTypes };
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query.status = { $in: filters.statuses };
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
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

    const [bulkOperations, total] = await Promise.all([
      this.bulkOperationModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
      this.bulkOperationModel.countDocuments(query),
    ]);

    return {
      bulkOperations: bulkOperations.map((bo) => BulkOperation.fromPersistence(bo)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, bulkOperation: BulkOperation): Promise<BulkOperation> {
    const bulkOperationData = bulkOperation.toPersistence();
    const updated = await this.bulkOperationModel
      .findByIdAndUpdate(id, bulkOperationData, { new: true })
      .exec();
    return updated ? BulkOperation.fromPersistence(updated) : bulkOperation;
  }

  async delete(id: string): Promise<void> {
    await this.bulkOperationModel.findByIdAndDelete(id).exec();
  }

  async findByUser(createdBy: string): Promise<BulkOperation[]> {
    const bulkOperations = await this.bulkOperationModel
      .find({ createdBy })
      .sort({ createdAt: -1 })
      .exec();

    return bulkOperations.map((bo) => BulkOperation.fromPersistence(bo));
  }

  async getStatistics(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    byOperationType: Record<string, number>;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  }> {
    const stats = await this.bulkOperationModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
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
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
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
      pending: result.pending,
      processing: result.processing,
      completed: result.completed,
      failed: result.failed,
      cancelled: result.cancelled,
      byOperationType,
      averageProcessingTime: result.averageProcessingTime || 0,
      successRate,
      errorRate,
    };
  }

  async cleanupOld(cutoffDate: Date): Promise<{ deletedCount: number }> {
    const result = await this.bulkOperationModel
      .deleteMany({
        status: { $in: ['completed', 'failed', 'cancelled'] },
        createdAt: { $lt: cutoffDate },
      })
      .exec();

    return { deletedCount: result.deletedCount || 0 };
  }
}
