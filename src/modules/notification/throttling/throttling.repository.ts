import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ThrottlingRule,
  ThrottlingRuleDocument,
  UserThrottlingProfile,
  UserThrottlingProfileDocument,
  ThrottlingStatistics,
  ThrottlingStatisticsDocument,
} from './throttling.schema';

@Injectable()
export class ThrottlingRepository {
  constructor(
    @InjectModel(ThrottlingRule.name) private throttlingRuleModel: Model<ThrottlingRuleDocument>,
    @InjectModel(UserThrottlingProfile.name)
    private userThrottlingProfileModel: Model<UserThrottlingProfileDocument>,
    @InjectModel(ThrottlingStatistics.name)
    private throttlingStatisticsModel: Model<ThrottlingStatisticsDocument>,
  ) {}

  // ThrottlingRule methods
  async createThrottlingRule(ruleData: Partial<ThrottlingRule>): Promise<ThrottlingRuleDocument> {
    const rule = new this.throttlingRuleModel(ruleData);
    return rule.save();
  }

  async findThrottlingRuleById(id: string): Promise<ThrottlingRuleDocument | null> {
    return this.throttlingRuleModel.findById(id).exec();
  }

  async findAllThrottlingRules(): Promise<ThrottlingRuleDocument[]> {
    return this.throttlingRuleModel.find().exec();
  }

  async updateThrottlingRule(
    id: string,
    updateData: Partial<ThrottlingRule>,
  ): Promise<ThrottlingRuleDocument | null> {
    return this.throttlingRuleModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async deleteThrottlingRule(id: string): Promise<boolean> {
    const result = await this.throttlingRuleModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  // UserThrottlingProfile methods
  async createUserThrottlingProfile(
    profileData: Partial<UserThrottlingProfile>,
  ): Promise<UserThrottlingProfileDocument> {
    const profile = new this.userThrottlingProfileModel(profileData);
    return profile.save();
  }

  async findUserThrottlingProfileByUserId(
    userId: string,
  ): Promise<UserThrottlingProfileDocument | null> {
    return this.userThrottlingProfileModel.findOne({ userId }).exec();
  }

  async updateUserThrottlingProfile(
    userId: string,
    updateData: Partial<UserThrottlingProfile>,
  ): Promise<UserThrottlingProfileDocument | null> {
    return this.userThrottlingProfileModel
      .findOneAndUpdate({ userId }, updateData, { new: true })
      .exec();
  }

  async deleteUserThrottlingProfile(userId: string): Promise<boolean> {
    const result = await this.userThrottlingProfileModel.findOneAndDelete({ userId }).exec();
    return !!result;
  }

  // ThrottlingStatistics methods
  async createThrottlingStatistics(
    statsData: Partial<ThrottlingStatistics>,
  ): Promise<ThrottlingStatisticsDocument> {
    const stats = new this.throttlingStatisticsModel(statsData);
    return stats.save();
  }

  async findThrottlingStatisticsByRuleId(ruleId: string): Promise<ThrottlingStatisticsDocument[]> {
    return this.throttlingStatisticsModel.find({ ruleId }).exec();
  }

  async updateThrottlingStatistics(
    ruleId: string,
    userId: string,
    updateData: Partial<ThrottlingStatistics>,
  ): Promise<ThrottlingStatisticsDocument | null> {
    return this.throttlingStatisticsModel
      .findOneAndUpdate({ ruleId, userId }, updateData, { new: true, upsert: true })
      .exec();
  }

  // Additional methods needed by service
  async findRuleByName(name: string): Promise<ThrottlingRuleDocument | null> {
    return this.throttlingRuleModel.findOne({ name }).exec();
  }

  async createRule(ruleData: Partial<ThrottlingRule>): Promise<ThrottlingRuleDocument> {
    const rule = new this.throttlingRuleModel(ruleData);
    return rule.save();
  }

  async findRuleById(id: string): Promise<ThrottlingRuleDocument | null> {
    return this.throttlingRuleModel.findById(id).exec();
  }

  async findManyRules(filters: any): Promise<ThrottlingRuleDocument[]> {
    return this.throttlingRuleModel.find(filters).exec();
  }

  async updateRule(
    id: string,
    updateData: Partial<ThrottlingRule>,
  ): Promise<ThrottlingRuleDocument | null> {
    return this.throttlingRuleModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async deleteRule(id: string): Promise<boolean> {
    const result = await this.throttlingRuleModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findApplicableRules(filters: any): Promise<ThrottlingRuleDocument[]> {
    return this.throttlingRuleModel.find({ ...filters, isActive: true }).exec();
  }

  async createUserProfile(
    profileData: Partial<UserThrottlingProfile>,
  ): Promise<UserThrottlingProfileDocument> {
    const profile = new this.userThrottlingProfileModel(profileData);
    return profile.save();
  }

  async findUserProfile(userId: string): Promise<UserThrottlingProfileDocument | null> {
    return this.userThrottlingProfileModel.findOne({ userId }).exec();
  }

  async updateUserProfile(
    userId: string,
    updateData: Partial<UserThrottlingProfile>,
  ): Promise<UserThrottlingProfileDocument | null> {
    return this.userThrottlingProfileModel
      .findOneAndUpdate({ userId }, updateData, { new: true })
      .exec();
  }

  async findStatisticsByDate(date: Date): Promise<ThrottlingStatisticsDocument[]> {
    return this.throttlingStatisticsModel.find({ date }).exec();
  }

  async recordEvent(eventData: any): Promise<ThrottlingStatisticsDocument> {
    const stats = new this.throttlingStatisticsModel(eventData);
    return stats.save();
  }

  async cleanupOldRecords(): Promise<number> {
    const result = await this.throttlingStatisticsModel
      .deleteMany({
        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days ago
      })
      .exec();
    return result.deletedCount || 0;
  }

  async getOrCreateRecord(ruleId: string, userId: string): Promise<ThrottlingStatisticsDocument> {
    let record = await this.throttlingStatisticsModel.findOne({ ruleId, userId }).exec();
    if (!record) {
      record = new this.throttlingStatisticsModel({ ruleId, userId });
      await record.save();
    }
    return record;
  }

  async updateRuleStats(ruleId: string, stats: any): Promise<void> {
    // Implementation for updating rule statistics
  }

  async updateRecord(id: string, updateData: any): Promise<ThrottlingStatisticsDocument | null> {
    return this.throttlingStatisticsModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async createViolation(violationData: any): Promise<ThrottlingStatisticsDocument> {
    const violation = new this.throttlingStatisticsModel(violationData);
    return violation.save();
  }
}
