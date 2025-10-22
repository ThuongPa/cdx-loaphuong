import { Injectable, Query, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Analytics,
  AnalyticsDocument,
  AnalyticsEventType,
  AnalyticsMetricType,
} from './analytics.schema';
import {
  AnalyticsAggregation,
  AnalyticsAggregationDocument,
  AggregationPeriod,
} from './analytics-aggregation.schema';
import { Model, Document, Types } from 'mongoose';
import { Type } from 'class-transformer';

export interface AnalyticsFilters {
  eventType?: AnalyticsEventType;
  metricName?: string;
  userId?: string;
  channel?: string;
  category?: string;
  priority?: string;
  templateId?: string;
  campaignId?: string;
  deviceType?: string;
  userSegment?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dimensions?: Record<string, any>;
}

export interface AnalyticsSortOptions {
  field: 'timestamp' | 'value' | 'metricName';
  order: 'asc' | 'desc';
}

export interface AnalyticsPaginationOptions {
  page: number;
  limit: number;
}

export interface AnalyticsQueryResult {
  analytics: AnalyticsDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsAggregationOptions {
  metricName: string;
  period: AggregationPeriod;
  startDate: Date;
  endDate: Date;
  dimensions?: Record<string, any>;
  groupBy?: string[];
}

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectModel(Analytics.name) private readonly analyticsModel: Model<AnalyticsDocument>,
    @InjectModel(AnalyticsAggregation.name)
    private readonly aggregationModel: Model<AnalyticsAggregationDocument>,
  ) {}

  // Analytics CRUD operations
  async create(analyticsData: Partial<Analytics>): Promise<AnalyticsDocument> {
    const analytics = new this.analyticsModel(analyticsData);
    return analytics.save();
  }

  async createMany(analyticsData: Partial<Analytics>[]): Promise<AnalyticsDocument[]> {
    return this.analyticsModel.insertMany(analyticsData as any) as any;
  }

  async findById(id: string): Promise<AnalyticsDocument | null> {
    return this.analyticsModel.findById(id).exec();
  }

  async findMany(
    filters: AnalyticsFilters = {},
    sort: AnalyticsSortOptions = { field: 'timestamp', order: 'desc' },
    pagination: AnalyticsPaginationOptions = { page: 1, limit: 10 },
  ): Promise<AnalyticsQueryResult> {
    const query = this.buildQuery(filters);
    const sortOptions = this.buildSortOptions(sort);
    const skip = (pagination.page - 1) * pagination.limit;

    const [analytics, total] = await Promise.all([
      this.analyticsModel.find(query).sort(sortOptions).skip(skip).limit(pagination.limit).exec(),
      this.analyticsModel.countDocuments(query),
    ]);

    return {
      analytics,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async getMetrics(
    filters: AnalyticsFilters = {},
    groupBy: string[] = ['metricName'],
  ): Promise<any[]> {
    const query = this.buildQuery(filters);
    const groupStage: any = { _id: {} };

    groupBy.forEach((field) => {
      groupStage._id[field] = `$${field}`;
    });

    groupStage._id.date = {
      $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
    };

    groupStage.totalValue = { $sum: '$value' };
    groupStage.count = { $sum: 1 };
    groupStage.averageValue = { $avg: '$value' };
    groupStage.minValue = { $min: '$value' };
    groupStage.maxValue = { $max: '$value' };

    return this.analyticsModel
      .aggregate([{ $match: query }, { $group: groupStage }, { $sort: { '_id.date': -1 } }])
      .exec();
  }

  async getTimeSeriesMetrics(
    filters: AnalyticsFilters = {},
    period: AggregationPeriod = AggregationPeriod.DAILY,
  ): Promise<any[]> {
    const query = this.buildQuery(filters);
    const dateFormat = this.getDateFormat(period);

    return this.analyticsModel
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: dateFormat, date: '$timestamp' } },
              metricName: '$metricName',
            },
            totalValue: { $sum: '$value' },
            count: { $sum: 1 },
            averageValue: { $avg: '$value' },
            dimensions: { $first: '$dimensions' },
          },
        },
        { $sort: { '_id.date': 1 } },
      ])
      .exec();
  }

  async getChannelPerformance(filters: AnalyticsFilters = {}): Promise<any[]> {
    const query = this.buildQuery(filters);

    return this.analyticsModel
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              channel: '$dimensions.channel',
              metricName: '$metricName',
            },
            totalValue: { $sum: '$value' },
            count: { $sum: 1 },
            averageValue: { $avg: '$value' },
            successRate: {
              $avg: {
                $cond: [
                  { $in: ['$eventType', ['notification.delivered', 'notification.read']] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { totalValue: -1 } },
      ])
      .exec();
  }

  async getUserEngagementMetrics(userId: string, dateFrom?: Date, dateTo?: Date): Promise<any[]> {
    const query: any = {
      'dimensions.userId': userId,
      eventType: {
        $in: [AnalyticsEventType.USER_ENGAGEMENT, AnalyticsEventType.NOTIFICATION_READ],
      },
    };

    if (dateFrom) query.timestamp = { ...query.timestamp, $gte: dateFrom };
    if (dateTo) query.timestamp = { ...query.timestamp, $lte: dateTo };

    return this.analyticsModel
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              eventType: '$eventType',
            },
            count: { $sum: 1 },
            totalValue: { $sum: '$value' },
          },
        },
        { $sort: { '_id.date': -1 } },
      ])
      .exec();
  }

  async getNotificationEffectivenessMetrics(filters: AnalyticsFilters = {}): Promise<any[]> {
    const query = this.buildQuery(filters);

    return this.analyticsModel
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              templateId: '$dimensions.templateId',
              category: '$dimensions.category',
              priority: '$dimensions.priority',
            },
            sent: {
              $sum: {
                $cond: [{ $eq: ['$eventType', AnalyticsEventType.NOTIFICATION_SENT] }, 1, 0],
              },
            },
            delivered: {
              $sum: {
                $cond: [{ $eq: ['$eventType', AnalyticsEventType.NOTIFICATION_DELIVERED] }, 1, 0],
              },
            },
            read: {
              $sum: {
                $cond: [{ $eq: ['$eventType', AnalyticsEventType.NOTIFICATION_READ] }, 1, 0],
              },
            },
            clicked: {
              $sum: {
                $cond: [{ $eq: ['$eventType', AnalyticsEventType.NOTIFICATION_CLICKED] }, 1, 0],
              },
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ['$eventType', AnalyticsEventType.NOTIFICATION_FAILED] }, 1, 0],
              },
            },
          },
        },
        {
          $addFields: {
            deliveryRate: {
              $cond: [{ $gt: ['$sent', 0] }, { $divide: ['$delivered', '$sent'] }, 0],
            },
            readRate: {
              $cond: [{ $gt: ['$delivered', 0] }, { $divide: ['$read', '$delivered'] }, 0],
            },
            clickRate: {
              $cond: [{ $gt: ['$read', 0] }, { $divide: ['$clicked', '$read'] }, 0],
            },
            failureRate: {
              $cond: [{ $gt: ['$sent', 0] }, { $divide: ['$failed', '$sent'] }, 0],
            },
          },
        },
        { $sort: { deliveryRate: -1 } },
      ])
      .exec();
  }

  // Aggregation operations
  async createAggregation(
    aggregationData: Partial<AnalyticsAggregation>,
  ): Promise<AnalyticsAggregationDocument> {
    const aggregation = new this.aggregationModel(aggregationData);
    return aggregation.save();
  }

  async findAggregations(
    metricName: string,
    period: AggregationPeriod,
    startDate: Date,
    endDate: Date,
  ): Promise<AnalyticsAggregationDocument[]> {
    return this.aggregationModel
      .find({
        metricName,
        period,
        startDate: { $gte: startDate },
        endDate: { $lte: endDate },
      })
      .sort({ startDate: 1 })
      .exec();
  }

  async getAggregatedMetrics(
    options: AnalyticsAggregationOptions,
  ): Promise<AnalyticsAggregationDocument[]> {
    const query: any = {
      metricName: options.metricName,
      period: options.period,
      startDate: { $gte: options.startDate },
      endDate: { $lte: options.endDate },
    };

    if (options.dimensions) {
      Object.keys(options.dimensions).forEach((key) => {
        query[`dimensions.${key}`] = options.dimensions![key];
      });
    }

    return this.aggregationModel.find(query).sort({ startDate: 1 }).exec();
  }

  async cleanupOldData(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.analyticsModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  private buildQuery(filters: AnalyticsFilters): any {
    const query: any = {};

    if (filters.eventType) {
      query.eventType = filters.eventType;
    }

    if (filters.metricName) {
      query.metricName = filters.metricName;
    }

    if (filters.userId) {
      query['dimensions.userId'] = filters.userId;
    }

    if (filters.channel) {
      query['dimensions.channel'] = filters.channel;
    }

    if (filters.category) {
      query['dimensions.category'] = filters.category;
    }

    if (filters.priority) {
      query['dimensions.priority'] = filters.priority;
    }

    if (filters.templateId) {
      query['dimensions.templateId'] = filters.templateId;
    }

    if (filters.campaignId) {
      query['dimensions.campaignId'] = filters.campaignId;
    }

    if (filters.deviceType) {
      query['dimensions.deviceType'] = filters.deviceType;
    }

    if (filters.userSegment) {
      query['dimensions.userSegment'] = filters.userSegment;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.timestamp = {};
      if (filters.dateFrom) query.timestamp.$gte = filters.dateFrom;
      if (filters.dateTo) query.timestamp.$lte = filters.dateTo;
    }

    if (filters.dimensions) {
      Object.keys(filters.dimensions).forEach((key) => {
        query[`dimensions.${key}`] = filters.dimensions![key];
      });
    }

    return query;
  }

  private buildSortOptions(sort: AnalyticsSortOptions): any {
    const order = sort.order === 'asc' ? 1 : -1;
    return { [sort.field]: order };
  }

  private getDateFormat(period: AggregationPeriod): string {
    switch (period) {
      case AggregationPeriod.HOURLY:
        return '%Y-%m-%d %H:00:00';
      case AggregationPeriod.DAILY:
        return '%Y-%m-%d';
      case AggregationPeriod.WEEKLY:
        return '%Y-%U';
      case AggregationPeriod.MONTHLY:
        return '%Y-%m';
      case AggregationPeriod.YEARLY:
        return '%Y';
      default:
        return '%Y-%m-%d';
    }
  }
}
