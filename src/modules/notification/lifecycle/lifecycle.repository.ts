import { Injectable, Delete } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { Type } from 'class-transformer';
import {
  NotificationLifecycle,
  LifecyclePolicy,
  LifecycleExecution,
  DataRetentionRule,
  LifecycleStatistics,
  LifecycleStage,
  RetentionPolicy,
  ArchivalStatus,
  NotificationLifecycleDocument,
  LifecyclePolicyDocument,
  LifecycleExecutionDocument,
  DataRetentionRuleDocument,
  LifecycleStatisticsDocument,
} from './lifecycle.schema';

@Injectable()
export class LifecycleRepository {
  constructor(
    @InjectModel(NotificationLifecycle.name)
    private lifecycleModel: Model<NotificationLifecycleDocument>,
    @InjectModel(LifecyclePolicy.name)
    private policyModel: Model<LifecyclePolicyDocument>,
    @InjectModel(LifecycleExecution.name)
    private executionModel: Model<LifecycleExecutionDocument>,
    @InjectModel(DataRetentionRule.name)
    private retentionRuleModel: Model<DataRetentionRuleDocument>,
    @InjectModel(LifecycleStatistics.name)
    private statisticsModel: Model<LifecycleStatisticsDocument>,
  ) {}

  // Lifecycle CRUD operations
  async createLifecycle(
    lifecycleData: Partial<NotificationLifecycle>,
  ): Promise<NotificationLifecycle> {
    const lifecycle = new this.lifecycleModel(lifecycleData);
    return lifecycle.save();
  }

  async getLifecycleById(id: string): Promise<NotificationLifecycle | null> {
    return this.lifecycleModel.findById(id).exec();
  }

  async getLifecycleByNotificationId(
    notificationId: string,
  ): Promise<NotificationLifecycle | null> {
    return this.lifecycleModel
      .findOne({ notificationId: new Types.ObjectId(notificationId) })
      .exec();
  }

  async updateLifecycle(
    id: string,
    updateData: Partial<NotificationLifecycle>,
  ): Promise<NotificationLifecycle | null> {
    return this.lifecycleModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async deleteLifecycle(id: string): Promise<boolean> {
    const result = await this.lifecycleModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  // Lifecycle stage management
  async updateLifecycleStage(
    id: string,
    newStage: LifecycleStage,
    metadata?: Record<string, any>,
    triggeredBy?: string,
    reason?: string,
  ): Promise<NotificationLifecycle | null> {
    const lifecycle = await this.lifecycleModel.findById(id);
    if (!lifecycle) return null;

    const stageEntry = {
      stage: newStage,
      timestamp: new Date(),
      metadata,
      triggeredBy,
      reason,
    };

    lifecycle.currentStage = newStage;
    if (lifecycle.stageHistory) {
      lifecycle.stageHistory.push(stageEntry);
    }

    return lifecycle.save();
  }

  async getLifecyclesByStage(stage: LifecycleStage): Promise<NotificationLifecycle[]> {
    return this.lifecycleModel.find({ currentStage: stage }).exec();
  }

  async getLifecyclesByUser(userId: string): Promise<NotificationLifecycle[]> {
    return this.lifecycleModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async getLifecyclesByRetentionPolicy(policy: RetentionPolicy): Promise<NotificationLifecycle[]> {
    return this.lifecycleModel.find({ 'retention.policy': policy }).exec();
  }

  async getLifecyclesByArchivalStatus(status: ArchivalStatus): Promise<NotificationLifecycle[]> {
    return this.lifecycleModel.find({ archivalStatus: status }).exec();
  }

  // Lifecycle filtering and search
  async findLifecycles(filters: {
    stages?: LifecycleStage[];
    channels?: string[];
    categories?: string[];
    priorities?: string[];
    userSegments?: string[];
    ageDays?: { min?: number; max?: number };
    engagementLevel?: 'low' | 'medium' | 'high';
    retentionPolicy?: RetentionPolicy;
    archivalStatus?: ArchivalStatus;
    dateRange?: { start: Date; end: Date };
    limit?: number;
    offset?: number;
  }): Promise<NotificationLifecycle[]> {
    const query: any = {};

    if (filters.stages) {
      query.currentStage = { $in: filters.stages };
    }

    if (filters.channels) {
      query['metadata.channel'] = { $in: filters.channels };
    }

    if (filters.categories) {
      query['metadata.category'] = { $in: filters.categories };
    }

    if (filters.priorities) {
      query['metadata.priority'] = { $in: filters.priorities };
    }

    if (filters.retentionPolicy) {
      query['retention.policy'] = filters.retentionPolicy;
    }

    if (filters.archivalStatus) {
      query.archivalStatus = filters.archivalStatus;
    }

    if (filters.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end,
      };
    }

    if (filters.ageDays) {
      const now = new Date();
      if (filters.ageDays.min) {
        const minDate = new Date(now.getTime() - filters.ageDays.min * 24 * 60 * 60 * 1000);
        query.createdAt = { ...query.createdAt, $gte: minDate };
      }
      if (filters.ageDays.max) {
        const maxDate = new Date(now.getTime() - filters.ageDays.max * 24 * 60 * 60 * 1000);
        query.createdAt = { ...query.createdAt, $lte: maxDate };
      }
    }

    if (filters.engagementLevel) {
      const thresholds = {
        low: { $lt: 0.3 },
        medium: { $gte: 0.3, $lt: 0.7 },
        high: { $gte: 0.7 },
      };
      query['analytics.engagementScore'] = thresholds[filters.engagementLevel];
    }

    return this.lifecycleModel
      .find(query)
      .limit(filters.limit || 100)
      .skip(filters.offset || 0)
      .sort({ createdAt: -1 })
      .exec();
  }

  // Lifecycle statistics
  async getLifecycleStatistics(dateRange?: { start: Date; end: Date }): Promise<{
    total: number;
    byStage: Record<LifecycleStage, number>;
    byRetention: Record<RetentionPolicy, number>;
    byChannel: Record<string, number>;
    averageAge: number;
    averageEngagementScore: number;
  }> {
    const matchStage: any = {};
    if (dateRange) {
      matchStage.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const [total, byStage, byRetention, byChannel, averages] = await Promise.all([
      this.lifecycleModel.countDocuments(matchStage),
      this.lifecycleModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$currentStage', count: { $sum: 1 } } },
      ]),
      this.lifecycleModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$retention.policy', count: { $sum: 1 } } },
      ]),
      this.lifecycleModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$metadata.channel', count: { $sum: 1 } } },
      ]),
      this.lifecycleModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            averageAge: { $avg: { $subtract: [new Date(), '$createdAt'] } },
            averageEngagementScore: { $avg: '$analytics.engagementScore' },
          },
        },
      ]),
    ]);

    return {
      total,
      byStage: byStage.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byRetention: byRetention.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byChannel: byChannel.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      averageAge: averages[0]?.averageAge || 0,
      averageEngagementScore: averages[0]?.averageEngagementScore || 0,
    };
  }

  // Policy CRUD operations
  async createPolicy(policyData: Partial<LifecyclePolicy>): Promise<LifecyclePolicy> {
    const policy = new this.policyModel(policyData);
    return policy.save();
  }

  async getPolicyById(id: string): Promise<LifecyclePolicy | null> {
    return this.policyModel.findById(id).exec();
  }

  async getPolicyByName(name: string): Promise<LifecyclePolicy | null> {
    return this.policyModel.findOne({ name }).exec();
  }

  async updatePolicy(
    id: string,
    updateData: Partial<LifecyclePolicy>,
  ): Promise<LifecyclePolicy | null> {
    return this.policyModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async deletePolicy(id: string): Promise<boolean> {
    const result = await this.policyModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async getActivePolicies(): Promise<LifecyclePolicy[]> {
    return this.policyModel.find({ isActive: true }).exec();
  }

  async getPoliciesBySchedule(frequency: string): Promise<LifecyclePolicy[]> {
    return this.policyModel
      .find({
        isActive: true,
        'schedule.frequency': frequency,
      })
      .exec();
  }

  // Policy execution
  async createExecution(executionData: Partial<LifecycleExecution>): Promise<LifecycleExecution> {
    const execution = new this.executionModel(executionData);
    return execution.save();
  }

  async updateExecution(
    id: string,
    updateData: Partial<LifecycleExecution>,
  ): Promise<LifecycleExecution | null> {
    return this.executionModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async getExecutionById(id: string): Promise<LifecycleExecution | null> {
    return this.executionModel.findById(id).exec();
  }

  async getExecutionsByPolicy(policyId: string): Promise<LifecycleExecution[]> {
    return this.executionModel
      .find({ policyId: new Types.ObjectId(policyId) })
      .sort({ startedAt: -1 })
      .exec();
  }

  async getRecentExecutions(limit: number = 10): Promise<LifecycleExecution[]> {
    return this.executionModel.find().sort({ startedAt: -1 }).limit(limit).exec();
  }

  // Retention rule CRUD operations
  async createRetentionRule(ruleData: Partial<DataRetentionRule>): Promise<DataRetentionRule> {
    const rule = new this.retentionRuleModel(ruleData);
    return rule.save();
  }

  async getRetentionRuleById(id: string): Promise<DataRetentionRule | null> {
    return this.retentionRuleModel.findById(id).exec();
  }

  async updateRetentionRule(
    id: string,
    updateData: Partial<DataRetentionRule>,
  ): Promise<DataRetentionRule | null> {
    return this.retentionRuleModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async deleteRetentionRule(id: string): Promise<boolean> {
    const result = await this.retentionRuleModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async getActiveRetentionRules(): Promise<DataRetentionRule[]> {
    return this.retentionRuleModel.find({ isActive: true }).exec();
  }

  // Statistics management
  async createStatistics(statsData: Partial<LifecycleStatistics>): Promise<LifecycleStatistics> {
    const stats = new this.statisticsModel(statsData);
    return stats.save();
  }

  async getStatisticsByDate(date: Date): Promise<LifecycleStatistics | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.statisticsModel
      .findOne({
        date: { $gte: startOfDay, $lte: endOfDay },
      })
      .exec();
  }

  async getStatisticsByDateRange(startDate: Date, endDate: Date): Promise<LifecycleStatistics[]> {
    return this.statisticsModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: 1 })
      .exec();
  }

  // Bulk operations
  async bulkUpdateLifecycleStage(
    lifecycleIds: string[],
    newStage: LifecycleStage,
    metadata?: Record<string, any>,
    triggeredBy?: string,
    reason?: string,
  ): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const id of lifecycleIds) {
      try {
        const result = await this.updateLifecycleStage(id, newStage, metadata, triggeredBy, reason);
        if (result) successCount++;
        else errorCount++;
      } catch (error) {
        errorCount++;
      }
    }

    return { successCount, errorCount };
  }

  async bulkArchiveLifecycles(
    lifecycleIds: string[],
  ): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const id of lifecycleIds) {
      try {
        const result = await this.lifecycleModel.findByIdAndUpdate(id, {
          archivalStatus: ArchivalStatus.ARCHIVED,
          archivedAt: new Date(),
        });
        if (result) successCount++;
        else errorCount++;
      } catch (error) {
        errorCount++;
      }
    }

    return { successCount, errorCount };
  }

  async bulkDeleteLifecycles(
    lifecycleIds: string[],
  ): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const id of lifecycleIds) {
      try {
        const result = await this.lifecycleModel.findByIdAndUpdate(id, {
          currentStage: LifecycleStage.DELETED,
          deletedAt: new Date(),
        });
        if (result) successCount++;
        else errorCount++;
      } catch (error) {
        errorCount++;
      }
    }

    return { successCount, errorCount };
  }

  // Cleanup operations
  async cleanupExpiredLifecycles(): Promise<{ deletedCount: number }> {
    const now = new Date();
    const result = await this.lifecycleModel.deleteMany({
      'retention.expiresAt': { $lt: now },
      currentStage: { $in: [LifecycleStage.ARCHIVED, LifecycleStage.DELETED] },
    });

    return { deletedCount: result.deletedCount };
  }

  async cleanupOldExecutions(daysOld: number = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.executionModel.deleteMany({
      startedAt: { $lt: cutoffDate },
    });

    return { deletedCount: result.deletedCount };
  }
}
