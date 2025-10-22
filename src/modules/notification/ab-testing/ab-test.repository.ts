import { Injectable, Delete, Query, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AbTest, AbTestDocument, AbTestStatus, AbTestType } from './ab-test.schema';
import { AbTestParticipant, AbTestParticipantDocument, ParticipantStatus } from './ab-test-participant.schema';
import { Model, Document, Types } from 'mongoose';
import { Type } from 'class-transformer';


export interface AbTestFilters {
  name?: string;
  testType?: AbTestType;
  status?: AbTestStatus;
  createdBy?: string;
  startDate?: Date;
  endDate?: Date;
  userSegments?: string[];
  categories?: string[];
  channels?: string[];
  search?: string;
}

export interface AbTestSortOptions {
  field: 'name' | 'createdAt' | 'startedAt' | 'completedAt';
  order: 'asc' | 'desc';
}

export interface AbTestPaginationOptions {
  page: number;
  limit: number;
}

export interface AbTestQueryResult {
  tests: AbTestDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ParticipantFilters {
  testId?: string;
  userId?: string;
  variationId?: string;
  status?: ParticipantStatus;
  enrolledFrom?: Date;
  enrolledTo?: Date;
}

@Injectable()
export class AbTestRepository {
  constructor(
    @InjectModel(AbTest.name) private readonly abTestModel: Model<AbTestDocument>,
    @InjectModel(AbTestParticipant.name)
    private readonly participantModel: Model<AbTestParticipantDocument>,
  ) {}

  // AbTest CRUD operations
  async create(testData: Partial<AbTest>): Promise<AbTestDocument> {
    const test = new this.abTestModel(testData);
    return test.save();
  }

  async findById(id: string): Promise<AbTestDocument | null> {
    return this.abTestModel.findById(id).exec();
  }

  async findByName(name: string): Promise<AbTestDocument | null> {
    return this.abTestModel.findOne({ name }).exec();
  }

  async findMany(
    filters: AbTestFilters = {},
    sort: AbTestSortOptions = { field: 'createdAt', order: 'desc' },
    pagination: AbTestPaginationOptions = { page: 1, limit: 10 },
  ): Promise<AbTestQueryResult> {
    const query = this.buildQuery(filters);
    const sortOptions = this.buildSortOptions(sort);
    const skip = (pagination.page - 1) * pagination.limit;

    const [tests, total] = await Promise.all([
      this.abTestModel.find(query).sort(sortOptions).skip(skip).limit(pagination.limit).exec(),
      this.abTestModel.countDocuments(query),
    ]);

    return {
      tests,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async updateById(id: string, updateData: Partial<AbTest>): Promise<AbTestDocument | null> {
    return this.abTestModel
      .findByIdAndUpdate(id, { ...updateData, updatedAt: new Date() }, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.abTestModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findActiveTests(): Promise<AbTestDocument[]> {
    return this.abTestModel
      .find({
        status: AbTestStatus.ACTIVE,
        'duration.startDate': { $lte: new Date() },
        'duration.endDate': { $gte: new Date() },
      })
      .exec();
  }

  async findTestsByUser(userId: string): Promise<AbTestDocument[]> {
    const participantTests = await this.participantModel.find({ userId }).distinct('testId').exec();

    return this.abTestModel.find({ _id: { $in: participantTests } }).exec();
  }

  async findTestsByTargetAudience(
    userSegments?: string[],
    categories?: string[],
    channels?: string[],
  ): Promise<AbTestDocument[]> {
    const query: any = {
      status: AbTestStatus.ACTIVE,
      'duration.startDate': { $lte: new Date() },
      'duration.endDate': { $gte: new Date() },
    };

    if (userSegments && userSegments.length > 0) {
      query['targetAudience.userSegments'] = { $in: userSegments };
    }

    if (categories && categories.length > 0) {
      query['targetAudience.categories'] = { $in: categories };
    }

    if (channels && channels.length > 0) {
      query['targetAudience.channels'] = { $in: channels };
    }

    return this.abTestModel.find(query).exec();
  }

  // Participant operations
  async createParticipant(
    participantData: Partial<AbTestParticipant>,
  ): Promise<AbTestParticipantDocument> {
    const participant = new this.participantModel(participantData);
    return participant.save();
  }

  async findParticipant(testId: string, userId: string): Promise<AbTestParticipantDocument | null> {
    return this.participantModel.findOne({ testId, userId }).exec();
  }

  async findParticipantsByTest(testId: string): Promise<AbTestParticipantDocument[]> {
    return this.participantModel.find({ testId }).exec();
  }

  async findParticipantsByVariation(
    testId: string,
    variationId: string,
  ): Promise<AbTestParticipantDocument[]> {
    return this.participantModel.find({ testId, variationId }).exec();
  }

  async updateParticipant(
    testId: string,
    userId: string,
    updateData: Partial<AbTestParticipant>,
  ): Promise<AbTestParticipantDocument | null> {
    return this.participantModel
      .findOneAndUpdate({ testId, userId }, { ...updateData, updatedAt: new Date() }, { new: true })
      .exec();
  }

  async addInteraction(
    testId: string,
    userId: string,
    interaction: {
      type: string;
      timestamp: Date;
      metadata?: Record<string, any>;
    },
  ): Promise<AbTestParticipantDocument | null> {
    return this.participantModel
      .findOneAndUpdate(
        { testId, userId },
        {
          $push: { interactions: interaction },
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async addConversion(
    testId: string,
    userId: string,
    conversion: {
      metricName: string;
      value: number;
      timestamp: Date;
      metadata?: Record<string, any>;
    },
  ): Promise<AbTestParticipantDocument | null> {
    return this.participantModel
      .findOneAndUpdate(
        { testId, userId },
        {
          $push: { conversions: conversion },
          status: ParticipantStatus.CONVERTED,
          convertedAt: conversion.timestamp,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async getTestResults(testId: string): Promise<any> {
    const participants = await this.participantModel.find({ testId }).exec();
    const test = await this.abTestModel.findById(testId).exec();

    if (!test) return null;

    const results = {
      totalParticipants: participants.length,
      controlGroup: {
        participants: 0,
        conversions: 0,
        conversionRate: 0,
        metrics: {},
      },
      variants: [],
    };

    // Calculate control group results
    const controlVariation = test.variations.find((v) => v.isControl);
    if (controlVariation) {
      const controlParticipants = participants.filter((p) => p.variationId === controlVariation.id);
      const controlConversions = controlParticipants.filter(
        (p) => p.status === ParticipantStatus.CONVERTED,
      ).length;

      results.controlGroup = {
        participants: controlParticipants.length,
        conversions: controlConversions,
        conversionRate:
          controlParticipants.length > 0 ? controlConversions / controlParticipants.length : 0,
        metrics: this.calculateMetrics(controlParticipants),
      };
    }

    // Calculate variant results
    for (const variation of test.variations) {
      if (!variation.isControl) {
        const variantParticipants = participants.filter((p) => p.variationId === variation.id);
        const variantConversions = variantParticipants.filter(
          (p) => p.status === ParticipantStatus.CONVERTED,
        ).length;

        const conversionRate =
          variantParticipants.length > 0 ? variantConversions / variantParticipants.length : 0;
        const controlRate = results.controlGroup.conversionRate;

        (results.variants as any[]).push({
          variationId: variation.id,
          participants: variantParticipants.length,
          conversions: variantConversions,
          conversionRate,
          metrics: this.calculateMetrics(variantParticipants),
          significance: this.calculateSignificance(
            controlRate,
            conversionRate,
            results.controlGroup.participants,
            variantParticipants.length,
          ),
          confidenceInterval: this.calculateConfidenceInterval(
            conversionRate,
            variantParticipants.length,
          ),
          isWinner: conversionRate > controlRate,
        });
      }
    }

    return results;
  }

  async getTestStatistics(testId: string): Promise<any> {
    const participants = await this.participantModel.find({ testId }).exec();
    const test = await this.abTestModel.findById(testId).exec();

    if (!test) return null;

    const statistics = {
      totalParticipants: participants.length,
      enrollmentRate: 0,
      exposureRate: 0,
      conversionRate: 0,
      dropOffRate: 0,
      byVariation: {},
      byStatus: {},
      byDay: {},
      trends: {
        enrollment: [],
        exposure: [],
        conversion: [],
      },
    };

    // Calculate overall statistics
    const exposed = participants.filter((p) => p.status === ParticipantStatus.EXPOSED).length;
    const converted = participants.filter((p) => p.status === ParticipantStatus.CONVERTED).length;
    const dropped = participants.filter((p) => p.status === ParticipantStatus.DROPPED).length;

    statistics.exposureRate = participants.length > 0 ? exposed / participants.length : 0;
    statistics.conversionRate = exposed > 0 ? converted / exposed : 0;
    statistics.dropOffRate = participants.length > 0 ? dropped / participants.length : 0;

    // Calculate by variation
    for (const variation of test.variations) {
      const variationParticipants = participants.filter((p) => p.variationId === variation.id);
      const variationExposed = variationParticipants.filter(
        (p) => p.status === ParticipantStatus.EXPOSED,
      ).length;
      const variationConverted = variationParticipants.filter(
        (p) => p.status === ParticipantStatus.CONVERTED,
      ).length;

      (statistics.byVariation as any)[variation.id] = {
        participants: variationParticipants.length,
        exposed: variationExposed,
        converted: variationConverted,
        exposureRate:
          variationParticipants.length > 0 ? variationExposed / variationParticipants.length : 0,
        conversionRate: variationExposed > 0 ? variationConverted / variationExposed : 0,
      };
    }

    // Calculate by status
    for (const status of Object.values(ParticipantStatus)) {
      (statistics.byStatus as any)[status] = participants.filter((p) => p.status === status).length;
    }

    return statistics;
  }

  async cleanupCompletedTests(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days after completion

    const result = await this.abTestModel.deleteMany({
      status: AbTestStatus.COMPLETED,
      completedAt: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  private buildQuery(filters: AbTestFilters): any {
    const query: any = {};

    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }

    if (filters.testType) {
      query.testType = filters.testType;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    if (filters.startDate || filters.endDate) {
      query['duration.startDate'] = {};
      if (filters.startDate) query['duration.startDate'].$gte = filters.startDate;
      if (filters.endDate) query['duration.startDate'].$lte = filters.endDate;
    }

    if (filters.userSegments && filters.userSegments.length > 0) {
      query['targetAudience.userSegments'] = { $in: filters.userSegments };
    }

    if (filters.categories && filters.categories.length > 0) {
      query['targetAudience.categories'] = { $in: filters.categories };
    }

    if (filters.channels && filters.channels.length > 0) {
      query['targetAudience.channels'] = { $in: filters.channels };
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return query;
  }

  private buildSortOptions(sort: AbTestSortOptions): any {
    const order = sort.order === 'asc' ? 1 : -1;
    return { [sort.field]: order };
  }

  private calculateMetrics(participants: AbTestParticipantDocument[]): Record<string, number> {
    const metrics: Record<string, number> = {};

    if (participants.length === 0) return metrics;

    // Calculate average interactions per participant
    const totalInteractions = participants.reduce((sum, p) => sum + p.interactions.length, 0);
    metrics.avgInteractions = totalInteractions / participants.length;

    // Calculate average conversions per participant
    const totalConversions = participants.reduce((sum, p) => sum + p.conversions.length, 0);
    metrics.avgConversions = totalConversions / participants.length;

    // Calculate engagement rate (participants with at least one interaction)
    const engagedParticipants = participants.filter((p) => p.interactions.length > 0).length;
    metrics.engagementRate = engagedParticipants / participants.length;

    return metrics;
  }

  private calculateSignificance(
    controlRate: number,
    variantRate: number,
    controlSample: number,
    variantSample: number,
  ): number {
    if (controlSample === 0 || variantSample === 0) return 0;

    const p1 = controlRate;
    const p2 = variantRate;
    const n1 = controlSample;
    const n2 = variantSample;

    const p = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    const z = Math.abs(p2 - p1) / se;

    // Two-tailed test
    return 2 * (1 - this.normalCDF(Math.abs(z)));
  }

  private calculateConfidenceInterval(
    rate: number,
    sampleSize: number,
    confidence: number = 0.95,
  ): {
    lower: number;
    upper: number;
  } {
    if (sampleSize === 0) return { lower: 0, upper: 0 };

    const z = this.getZScore(confidence);
    const se = Math.sqrt((rate * (1 - rate)) / sampleSize);
    const margin = z * se;

    return {
      lower: Math.max(0, rate - margin),
      upper: Math.min(1, rate + margin),
    };
  }

  private normalCDF(x: number): number {
    // Approximation of the cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of the error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private getZScore(confidence: number): number {
    const zScores: Record<number, number> = {
      0.9: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[confidence] || 1.96;
  }
}
