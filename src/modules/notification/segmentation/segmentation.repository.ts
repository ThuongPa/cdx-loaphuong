import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { Type } from 'class-transformer';
import {
  UserSegment,
  UserSegmentDocument,
  SegmentMember,
  SegmentMemberDocument,
  TargetingRule,
  TargetingRuleDocument,
  UserBehaviorProfile,
  UserBehaviorProfileDocument,
  SegmentationStatistics,
  SegmentationStatisticsDocument,
} from './segmentation.schema';

export enum SegmentationType {
  DEMOGRAPHIC = 'demographic',
  BEHAVIORAL = 'behavioral',
  GEOGRAPHIC = 'geographic',
  PSYCHOGRAPHIC = 'psychographic',
}

export enum SegmentationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

export interface UserSegmentFilters {
  name?: string;
  type?: SegmentationType;
  status?: SegmentationStatus;
  createdBy?: string;
  search?: string;
}

export interface UserSegmentSortOptions {
  field: 'name' | 'createdAt' | 'memberCount' | 'engagementScore';
  order: 'asc' | 'desc';
}

export interface UserSegmentPaginationOptions {
  page: number;
  limit: number;
}

export interface UserSegmentQueryResult {
  segments: UserSegmentDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SegmentationRepository {
  constructor(
    @InjectModel(UserSegment.name) private readonly segmentModel: Model<UserSegmentDocument>,
    @InjectModel(SegmentMember.name) private readonly memberModel: Model<SegmentMemberDocument>,
    @InjectModel(TargetingRule.name) private readonly ruleModel: Model<TargetingRuleDocument>,
    @InjectModel(UserBehaviorProfile.name)
    private readonly profileModel: Model<UserBehaviorProfileDocument>,
    @InjectModel(SegmentationStatistics.name)
    private readonly statisticsModel: Model<SegmentationStatisticsDocument>,
  ) {}

  // User Segment CRUD operations
  async createSegment(segmentData: Partial<UserSegment>): Promise<UserSegmentDocument> {
    const segment = new this.segmentModel(segmentData);
    return segment.save();
  }

  async findSegmentById(id: string): Promise<UserSegmentDocument | null> {
    return this.segmentModel.findById(id).exec();
  }

  async findSegmentByName(name: string): Promise<UserSegmentDocument | null> {
    return this.segmentModel.findOne({ name }).exec();
  }

  async findManySegments(
    filters: UserSegmentFilters = {},
    sort: UserSegmentSortOptions = { field: 'createdAt', order: 'desc' },
    pagination: UserSegmentPaginationOptions = { page: 1, limit: 10 },
  ): Promise<UserSegmentQueryResult> {
    const query = this.buildSegmentQuery(filters) as any;
    const sortOptions = this.buildSortOptions(sort) as any;
    const skip = (pagination.page - 1) * pagination.limit;

    const [segments, total] = await Promise.all([
      this.segmentModel.find(query).sort(sortOptions).skip(skip).limit(pagination.limit).exec(),
      this.segmentModel.countDocuments(query),
    ]);

    return {
      segments,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async updateSegment(
    id: string,
    updateData: Partial<UserSegment>,
  ): Promise<UserSegmentDocument | null> {
    return this.segmentModel
      .findByIdAndUpdate(id, { ...updateData, updatedAt: new Date() }, { new: true })
      .exec();
  }

  async deleteSegment(id: string): Promise<boolean> {
    const result = await this.segmentModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findActiveSegments(): Promise<UserSegmentDocument[]> {
    return this.segmentModel.find({ status: SegmentationStatus.ACTIVE }).exec();
  }

  async updateSegmentStats(
    segmentId: string,
    stats: {
      memberCount?: number;
      engagementScore?: number;
      lastEvaluatedAt?: Date;
    },
  ): Promise<UserSegmentDocument | null> {
    return this.segmentModel
      .findByIdAndUpdate(segmentId, { ...stats, updatedAt: new Date() }, { new: true })
      .exec();
  }

  // Segment Member operations
  async createSegmentMember(memberData: Partial<SegmentMember>): Promise<SegmentMemberDocument> {
    const member = new this.memberModel(memberData);
    return member.save();
  }

  async findSegmentMembers(segmentId: string): Promise<SegmentMemberDocument[]> {
    return this.memberModel
      .find({ segmentId: new (require('mongoose').Types.ObjectId)(segmentId) })
      .exec();
  }

  async findSegmentMember(
    segmentId: string,
    userId: string,
  ): Promise<SegmentMemberDocument | null> {
    return this.memberModel
      .findOne({ segmentId: new (require('mongoose').Types.ObjectId)(segmentId), userId })
      .exec();
  }

  async updateSegmentMember(
    segmentId: string,
    userId: string,
    updateData: Partial<SegmentMember>,
  ): Promise<SegmentMemberDocument | null> {
    return this.memberModel
      .findOneAndUpdate(
        { segmentId: new (require('mongoose').Types.ObjectId)(segmentId), userId },
        { ...updateData, updatedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async deleteSegmentMember(segmentId: string, userId: string): Promise<boolean> {
    const result = await this.memberModel
      .findOneAndDelete({
        segmentId: new (require('mongoose').Types.ObjectId)(segmentId),
        userId,
      })
      .exec();
    return !!result;
  }

  async findUserSegments(userId: string): Promise<SegmentMemberDocument[]> {
    return this.memberModel.find({ userId }).exec();
  }

  async getSegmentMemberStatistics(segmentId: string): Promise<any> {
    return this.memberModel
      .aggregate([
        { $match: { segmentId: new (require('mongoose').Types.ObjectId)(segmentId) } },
        {
          $group: {
            _id: null,
            totalMembers: { $sum: 1 },
            averageEngagementScore: { $avg: '$scores.engagementScore' },
            averageRelevanceScore: { $avg: '$scores.relevanceScore' },
            totalNotifications: { $sum: '$notificationCount' },
            totalEngagements: { $sum: '$engagementCount' },
            averageNotificationCount: { $avg: '$notificationCount' },
            averageEngagementCount: { $avg: '$engagementCount' },
          },
        },
      ])
      .exec();
  }

  // Targeting Rule operations
  async createTargetingRule(ruleData: Partial<TargetingRule>): Promise<TargetingRuleDocument> {
    const rule = new this.ruleModel(ruleData);
    return rule.save();
  }

  async findTargetingRuleById(id: string): Promise<TargetingRuleDocument | null> {
    return this.ruleModel.findById(id).exec();
  }

  async findTargetingRuleByName(name: string): Promise<TargetingRuleDocument | null> {
    return this.ruleModel.findOne({ name }).exec();
  }

  async findManyTargetingRules(
    filters: any = {},
    sort: any = { field: 'createdAt', order: 'desc' },
    pagination: any = { page: 1, limit: 10 },
  ): Promise<any> {
    const query = this.buildTargetingRuleQuery(filters);
    const sortOptions = this.buildSortOptions(sort) as any;
    const skip = (pagination.page - 1) * pagination.limit;

    const [rules, total] = await Promise.all([
      this.ruleModel.find(query).sort(sortOptions).skip(skip).limit(pagination.limit).exec(),
      this.ruleModel.countDocuments(query),
    ]);

    return {
      rules,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async updateTargetingRule(
    id: string,
    updateData: Partial<TargetingRule>,
  ): Promise<TargetingRuleDocument | null> {
    return this.ruleModel
      .findByIdAndUpdate(id, { ...updateData, updatedAt: new Date() }, { new: true })
      .exec();
  }

  async deleteTargetingRule(id: string): Promise<boolean> {
    const result = await this.ruleModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findActiveTargetingRules(): Promise<TargetingRuleDocument[]> {
    return this.ruleModel.find({ status: SegmentationStatus.ACTIVE }).exec();
  }

  async updateTargetingRuleStats(
    ruleId: string,
    stats: {
      hitCount?: number;
      successCount?: number;
      lastHitAt?: Date;
    },
  ): Promise<TargetingRuleDocument | null> {
    return this.ruleModel
      .findByIdAndUpdate(ruleId, { ...stats, updatedAt: new Date() }, { new: true })
      .exec();
  }

  // User Behavior Profile operations
  async createUserBehaviorProfile(
    profileData: Partial<UserBehaviorProfile>,
  ): Promise<UserBehaviorProfileDocument> {
    const profile = new this.profileModel(profileData);
    return profile.save();
  }

  async findUserBehaviorProfile(userId: string): Promise<UserBehaviorProfileDocument | null> {
    return this.profileModel.findOne({ userId }).exec();
  }

  async updateUserBehaviorProfile(
    userId: string,
    updateData: Partial<UserBehaviorProfile>,
  ): Promise<UserBehaviorProfileDocument | null> {
    return this.profileModel
      .findOneAndUpdate(
        { userId },
        { ...updateData, updatedAt: new Date() },
        { new: true, upsert: true },
      )
      .exec();
  }

  async deleteUserBehaviorProfile(userId: string): Promise<boolean> {
    const result = await this.profileModel.findOneAndDelete({ userId }).exec();
    return !!result;
  }

  async findBehaviorProfilesByScore(
    minScore: number,
    maxScore: number,
  ): Promise<UserBehaviorProfileDocument[]> {
    return this.profileModel
      .find({
        'scores.overallScore': { $gte: minScore, $lte: maxScore },
      })
      .exec();
  }

  async getBehaviorProfileStatistics(): Promise<any> {
    return this.profileModel
      .aggregate([
        {
          $group: {
            _id: null,
            totalProfiles: { $sum: 1 },
            averageEngagementScore: { $avg: '$scores.engagementScore' },
            averageActivityScore: { $avg: '$scores.activityScore' },
            averagePreferenceScore: { $avg: '$scores.preferenceScore' },
            averageTemporalScore: { $avg: '$scores.temporalScore' },
            averageOverallScore: { $avg: '$scores.overallScore' },
            byScoreRange: {
              $push: {
                score: '$scores.overallScore',
                count: 1,
              },
            },
          },
        },
      ])
      .exec();
  }

  // Statistics operations
  async findStatisticsByDate(date: Date): Promise<SegmentationStatisticsDocument | null> {
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

  async createStatistics(
    statisticsData: Partial<SegmentationStatistics>,
  ): Promise<SegmentationStatisticsDocument> {
    const statistics = new this.statisticsModel(statisticsData);
    return statistics.save();
  }

  async updateStatistics(
    date: Date,
    updateData: Partial<SegmentationStatistics>,
  ): Promise<SegmentationStatisticsDocument | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.statisticsModel
      .findOneAndUpdate(
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { ...updateData, updatedAt: new Date() },
        { new: true, upsert: true },
      )
      .exec();
  }

  async getStatisticsRange(
    startDate: Date,
    endDate: Date,
  ): Promise<SegmentationStatisticsDocument[]> {
    return this.statisticsModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: 1 })
      .exec();
  }

  // Cleanup operations
  async cleanupOldMembers(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.memberModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  async cleanupOldStatistics(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.statisticsModel.deleteMany({
      date: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  private buildSegmentQuery(filters: UserSegmentFilters): any {
    const query: any = {};

    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return query;
  }

  private buildTargetingRuleQuery(filters: any): any {
    const query: any = {};

    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return query;
  }

  private buildSortOptions(sort: UserSegmentSortOptions | any): any {
    const order = sort.order === 'asc' ? 1 : -1;
    return { [sort.field]: order };
  }
}
