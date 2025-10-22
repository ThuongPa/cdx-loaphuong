import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MonitoringMetric, MonitoringMetricDocument } from '../advanced-monitoring.schema';
import { AdvancedMonitoringRepository } from './advanced-monitoring.repository';
import {
  MonitoringMetricFilters,
  MonitoringDashboard,
} from '../application/services/advanced-monitoring.service';

@Injectable()
export class AdvancedMonitoringRepositoryImpl implements AdvancedMonitoringRepository {
  constructor(
    @InjectModel(MonitoringMetric.name)
    private monitoringMetricModel: Model<MonitoringMetricDocument>,
  ) {}

  async create(monitoringMetric: any): Promise<any> {
    const created = new this.monitoringMetricModel(monitoringMetric);
    return created.save();
  }

  async findById(id: string): Promise<any | null> {
    return this.monitoringMetricModel.findById(id).exec();
  }

  async findByMetricId(metricId: string): Promise<any | null> {
    return this.monitoringMetricModel.findOne({ metricId }).exec();
  }

  async find(filters: MonitoringMetricFilters): Promise<{
    monitoringMetrics: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (filters.names && filters.names.length > 0) {
      query.name = { $in: filters.names };
    }
    if (filters.types && filters.types.length > 0) {
      query.type = { $in: filters.types };
    }
    if (filters.sources && filters.sources.length > 0) {
      query.source = { $in: filters.sources };
    }
    if (filters.tags) {
      query.tags = { $all: Object.entries(filters.tags).map(([key, value]) => ({ [key]: value })) };
    }
    if (filters.dateRange) {
      query.timestamp = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end,
      };
    }

    const total = await this.monitoringMetricModel.countDocuments(query);
    const page = 1;
    const limit = filters.limit || 10;
    const skip = filters.offset || 0;

    const monitoringMetrics = await this.monitoringMetricModel
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      monitoringMetrics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, monitoringMetric: any): Promise<any> {
    return this.monitoringMetricModel.findByIdAndUpdate(id, monitoringMetric, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.monitoringMetricModel.findByIdAndDelete(id).exec();
  }

  async findBySource(source: string): Promise<any[]> {
    return this.monitoringMetricModel.find({ source }).exec();
  }

  async findByType(type: string): Promise<any[]> {
    return this.monitoringMetricModel.find({ type }).exec();
  }

  async findByTags(tags: Record<string, string>): Promise<any[]> {
    return this.monitoringMetricModel
      .find({ tags: { $all: Object.entries(tags).map(([key, value]) => ({ [key]: value })) } })
      .exec();
  }

  async getDashboard(): Promise<MonitoringDashboard> {
    const total = await this.monitoringMetricModel.countDocuments();
    const byType = await this.monitoringMetricModel.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const bySource = await this.monitoringMetricModel.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);
    const averageValue = await this.monitoringMetricModel.aggregate([
      { $group: { _id: null, average: { $avg: '$value' } } },
    ]);

    return {
      totalMetrics: total,
      metricsByType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      metricsBySource: bySource.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      topMetrics: [],
      recentMetrics: [],
      alerts: [],
    };
  }

  async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    averageValue: number;
    minValue: number;
    maxValue: number;
    recentCount: number;
  }> {
    const total = await this.monitoringMetricModel.countDocuments();
    const byType = await this.monitoringMetricModel.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const bySource = await this.monitoringMetricModel.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);
    const stats = await this.monitoringMetricModel.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: '$value' },
          min: { $min: '$value' },
          max: { $max: '$value' },
        },
      },
    ]);
    const recentCount = await this.monitoringMetricModel.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    return {
      total,
      byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      bySource: bySource.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      averageValue: stats[0]?.average || 0,
      minValue: stats[0]?.min || 0,
      maxValue: stats[0]?.max || 0,
      recentCount,
    };
  }

  async getTrends(
    metricName: string,
    timeRange: { start: Date; end: Date },
    interval: 'minute' | 'hour' | 'day',
  ): Promise<
    Array<{
      timestamp: Date;
      value: number;
      count: number;
    }>
  > {
    const groupBy =
      interval === 'minute' ? '$minute' : interval === 'hour' ? '$hour' : '$dayOfYear';
    const format =
      interval === 'minute' ? '%Y-%m-%d %H:%M' : interval === 'hour' ? '%Y-%m-%d %H' : '%Y-%m-%d';

    return this.monitoringMetricModel.aggregate([
      {
        $match: {
          metricName,
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
        },
      },
      {
        $group: {
          _id: { [groupBy]: '$timestamp' },
          value: { $avg: '$value' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getAlerts(): Promise<
    Array<{
      metricName: string;
      condition: string;
      value: number;
      threshold: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: Date;
    }>
  > {
    // This would typically query an alerts collection
    // For now, return empty array
    return [];
  }

  async createAlert(alert: {
    metricName: string;
    condition: string;
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }): Promise<void> {
    // This would typically create an alert in an alerts collection
    // For now, just log
    console.log('Alert created:', alert);
  }

  async cleanupOld(cutoffDate: Date): Promise<{ deletedCount: number }> {
    const result = await this.monitoringMetricModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });
    return { deletedCount: result.deletedCount || 0 };
  }

  async export(
    filters: MonitoringMetricFilters,
    format: 'json' | 'csv' | 'excel',
  ): Promise<{
    data: any;
    format: string;
    count: number;
    timestamp: Date;
  }> {
    const { monitoringMetrics } = await this.find(filters);
    return {
      data: monitoringMetrics,
      format,
      count: monitoringMetrics.length,
      timestamp: new Date(),
    };
  }

  async getHealth(): Promise<{
    isHealthy: boolean;
    status: string;
    metrics: {
      totalMetrics: number;
      activeMetrics: number;
      errorMetrics: number;
      averageValue: number;
      successRate: number;
    };
  }> {
    const total = await this.monitoringMetricModel.countDocuments();
    const active = await this.monitoringMetricModel.countDocuments({ status: 'active' });
    const error = await this.monitoringMetricModel.countDocuments({ status: 'error' });
    const averageValue = await this.monitoringMetricModel.aggregate([
      { $group: { _id: null, average: { $avg: '$value' } } },
    ]);
    const successRate = total > 0 ? (active / total) * 100 : 0;

    return {
      isHealthy: successRate > 80,
      status: successRate > 80 ? 'healthy' : 'unhealthy',
      metrics: {
        totalMetrics: total,
        activeMetrics: active,
        errorMetrics: error,
        averageValue: averageValue[0]?.average || 0,
        successRate,
      },
    };
  }
}
