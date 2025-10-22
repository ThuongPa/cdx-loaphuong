import { SegmentationRepository } from './segmentation.repository';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Get,
  Res,
} from '@nestjs/common';
import { StructuredLoggerService } from '../shared/services/structured-logger.service';
import { Document, Types } from 'mongoose';
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
  SegmentationType,
  SegmentationStatus,
  TargetingRuleType,
} from './segmentation.schema';

export interface CreateUserSegmentDto {
  name: string;
  description?: string;
  type: SegmentationType;
  criteria: {
    rules: {
      field: string;
      operator: TargetingRuleType;
      value: any;
      weight?: number;
    }[];
    logic: 'AND' | 'OR' | 'CUSTOM';
    customExpression?: string;
  };
  targeting: {
    channels: string[];
    categories: string[];
    priorities: string[];
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      timezone?: string;
      daysOfWeek?: number[];
    };
    frequencyLimits?: {
      maxNotificationsPerDay?: number;
      maxNotificationsPerHour?: number;
      cooldownMs?: number;
    };
  };
  metadata?: Record<string, any>;
}

export interface UpdateUserSegmentDto {
  name?: string;
  description?: string;
  criteria?: {
    rules: {
      field: string;
      operator: TargetingRuleType;
      value: any;
      weight?: number;
    }[];
    logic: 'AND' | 'OR' | 'CUSTOM';
    customExpression?: string;
  };
  targeting?: {
    channels: string[];
    categories: string[];
    priorities: string[];
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      timezone?: string;
      daysOfWeek?: number[];
    };
    frequencyLimits?: {
      maxNotificationsPerDay?: number;
      maxNotificationsPerHour?: number;
      cooldownMs?: number;
    };
  };
  status?: SegmentationStatus;
  metadata?: Record<string, any>;
}

export interface CreateTargetingRuleDto {
  name: string;
  description?: string;
  type: SegmentationType;
  conditions: {
    field: string;
    operator: TargetingRuleType;
    value: any;
    weight?: number;
  }[];
  targeting: {
    channels: string[];
    categories: string[];
    priorities: string[];
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      timezone?: string;
      daysOfWeek?: number[];
    };
    frequencyLimits?: {
      maxNotificationsPerDay?: number;
      maxNotificationsPerHour?: number;
      cooldownMs?: number;
    };
  };
  metadata?: Record<string, any>;
}

export interface EvaluateUserDto {
  userId: string;
  userProfile: {
    demographics: {
      age?: number;
      gender?: string;
      location?: {
        country?: string;
        city?: string;
        timezone?: string;
      };
      language?: string;
    };
    behavior: {
      lastActiveAt: Date;
      engagementScore: number;
      notificationFrequency: 'low' | 'medium' | 'high' | 'very_high';
      preferredChannels: string[];
      preferredCategories: string[];
      averageResponseTime: number;
      clickRate: number;
      openRate: number;
    };
    preferences: {
      channels: {
        channel: string;
        enabled: boolean;
        priority: number;
      }[];
      categories: {
        category: string;
        enabled: boolean;
        priority: number;
      }[];
      timeRestrictions: {
        startTime?: string;
        endTime?: string;
        timezone?: string;
        daysOfWeek?: number[];
      };
      frequencyLimits: {
        maxNotificationsPerDay?: number;
        maxNotificationsPerHour?: number;
        cooldownMs?: number;
      };
    };
  };
  metadata?: Record<string, any>;
}

export interface TargetingResult {
  userId: string;
  eligibleSegments: {
    segmentId: string;
    segmentName: string;
    score: number;
    targeting: {
      channels: string[];
      categories: string[];
      priorities: string[];
      timeRestrictions?: any;
      frequencyLimits?: any;
    };
  }[];
  recommendedTargeting: {
    channels: string[];
    categories: string[];
    priorities: string[];
    timeRestrictions?: any;
    frequencyLimits?: any;
  };
  confidence: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class SegmentationService {
  private readonly logger = new Logger(SegmentationService.name);

  constructor(
    private readonly segmentationRepository: SegmentationRepository,
    private readonly structuredLogger: StructuredLoggerService,
  ) {}

  async createUserSegment(
    createDto: CreateUserSegmentDto,
    createdBy: string,
  ): Promise<UserSegmentDocument> {
    try {
      // Validate segment data
      this.validateSegmentData(createDto);

      // Check for duplicate name
      const existingSegment = await this.segmentationRepository.findSegmentByName(createDto.name);
      if (existingSegment) {
        throw new ConflictException(`User segment with name '${createDto.name}' already exists`);
      }

      // Create segment
      const segmentData = {
        ...createDto,
        status: SegmentationStatus.DRAFT,
        memberCount: 0,
        engagementScore: 0,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const segment = await this.segmentationRepository.createSegment(segmentData);

      this.structuredLogger.log('user_segment_created', {
        // segmentId: segment._id,
        segmentName: segment.name,
        segmentType: segment.type,
        createdBy,
      });

      this.logger.log(`User segment created: ${segment.name} (${segment._id})`);
      return segment;
    } catch (error) {
      this.logger.error(`Failed to create user segment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSegmentById(id: string): Promise<UserSegmentDocument> {
    const segment = await this.segmentationRepository.findSegmentById(id);
    if (!segment) {
      throw new NotFoundException(`User segment with ID '${id}' not found`);
    }
    return segment;
  }

  async getSegments(
    filters: any = {},
    sort: any = { field: 'createdAt', order: 'desc' },
    pagination: any = { page: 1, limit: 10 },
  ): Promise<any> {
    return this.segmentationRepository.findManySegments(filters, sort, pagination);
  }

  async updateSegment(
    id: string,
    updateDto: UpdateUserSegmentDto,
    updatedBy: string,
  ): Promise<UserSegmentDocument> {
    try {
      const segment = await this.getSegmentById(id);

      // Validate update data
      if (updateDto.name && updateDto.name !== segment.name) {
        const existingSegment = await this.segmentationRepository.findSegmentByName(updateDto.name);
        if (existingSegment) {
          throw new ConflictException(`User segment with name '${updateDto.name}' already exists`);
        }
      }

      // Update segment
      const updatedSegment = await this.segmentationRepository.updateSegment(id, {
        ...updateDto,
        updatedBy,
      });

      if (!updatedSegment) {
        throw new NotFoundException(`User segment with ID '${id}' not found`);
      }

      this.structuredLogger.log('user_segment_updated', {
        segmentId: id,
        segmentName: updatedSegment.name,
        updatedBy,
        changes: Object.keys(updateDto),
      });

      this.logger.log(`User segment updated: ${updatedSegment.name} (${id})`);
      return updatedSegment;
    } catch (error) {
      this.logger.error(`Failed to update user segment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteSegment(id: string): Promise<void> {
    try {
      const segment = await this.getSegmentById(id);

      await this.segmentationRepository.deleteSegment(id);

      this.structuredLogger.log('user_segment_deleted', {
        // segmentId: id,
        segmentName: segment.name,
      });

      this.logger.log(`User segment deleted: ${segment.name} (${id})`);
    } catch (error) {
      this.logger.error(`Failed to delete user segment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async activateSegment(id: string, activatedBy: string): Promise<UserSegmentDocument> {
    try {
      const segment = await this.getSegmentById(id);

      if (segment.status !== SegmentationStatus.DRAFT) {
        throw new BadRequestException('Only draft segments can be activated');
      }

      const updatedSegment = await this.segmentationRepository.updateSegment(id, {
        status: SegmentationStatus.ACTIVE,
        updatedBy: activatedBy,
      });

      if (!updatedSegment) {
        throw new NotFoundException(`User segment with ID '${id}' not found`);
      }

      this.structuredLogger.log('user_segment_activated', {
        // segmentId: id,
        segmentName: segment.name,
        activatedBy,
      });

      this.logger.log(`User segment activated: ${segment.name} (${id})`);
      return updatedSegment;
    } catch (error) {
      this.logger.error(`Failed to activate user segment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async evaluateUser(evaluateDto: EvaluateUserDto): Promise<TargetingResult> {
    try {
      const { userId, userProfile, metadata } = evaluateDto;

      // Get active segments
      const activeSegments = await this.segmentationRepository.findActiveSegments();

      const eligibleSegments = [];
      let totalScore = 0;

      // Evaluate each segment
      for (const segment of activeSegments) {
        const score = await this.evaluateSegmentCriteria(segment, userProfile);

        if (score > 0) {
          eligibleSegments.push({
            segmentId: (segment._id as any).toString(),
            segmentName: segment.name,
            score,
            targeting: segment.targeting,
          });
          totalScore += score;
        }
      }

      // Sort by score
      eligibleSegments.sort((a, b) => b.score - a.score);

      // Generate recommended targeting
      const recommendedTargeting = this.generateRecommendedTargeting(eligibleSegments);

      // Calculate confidence
      const confidence = this.calculateConfidence(eligibleSegments, totalScore);

      const result: TargetingResult = {
        userId,
        eligibleSegments: eligibleSegments.map((segment) => ({
          segmentId: segment.segmentId,
          segmentName: segment.segmentName,
          score: segment.score,
          targeting: {
            channels: segment.targeting?.channels || [],
            categories: segment.targeting?.categories || [],
            priorities: segment.targeting?.priorities || [],
            timeRestrictions: segment.targeting?.timeRestrictions,
            frequencyLimits: segment.targeting?.frequencyLimits,
          },
        })),
        recommendedTargeting,
        confidence,
        metadata,
      };

      // Update user behavior profile
      await this.updateUserBehaviorProfile(userId, userProfile, eligibleSegments);

      this.structuredLogger.log('user_evaluated', {
        userId,
        eligibleSegments: eligibleSegments.length,
        confidence,
        topSegment: eligibleSegments[0]?.segmentName,
      });

      this.logger.log(`User evaluated: ${userId} - ${eligibleSegments.length} eligible segments`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to evaluate user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSegmentMembers(segmentId: string): Promise<SegmentMemberDocument[]> {
    try {
      const members = await this.segmentationRepository.findSegmentMembers(segmentId);
      this.logger.log(`Retrieved ${members.length} members for segment ${segmentId}`);
      return members;
    } catch (error) {
      this.logger.error(`Failed to get segment members: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addUserToSegment(
    segmentId: string,
    userId: string,
    userProfile: any,
  ): Promise<SegmentMemberDocument> {
    try {
      const segment = await this.getSegmentById(segmentId);

      if (segment.status !== 'active') {
        throw new BadRequestException('Cannot add users to inactive segment');
      }

      const member = await this.segmentationRepository.createSegmentMember({
        segmentId: (segment._id as any).toString(),
        userId,
      });

      // Update segment member count
      await this.segmentationRepository.updateSegmentStats(segmentId, {
        memberCount: 1,
      });

      this.structuredLogger.log('user_added_to_segment', {
        segmentId,
        userId,
        segmentName: segment.name,
      });

      this.logger.log(`User added to segment: ${userId} -> ${segment.name}`);
      return member;
    } catch (error) {
      this.logger.error(`Failed to add user to segment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeUserFromSegment(segmentId: string, userId: string): Promise<void> {
    try {
      const segment = await this.getSegmentById(segmentId);

      await this.segmentationRepository.deleteSegmentMember(segmentId, userId);

      // Update segment member count
      await this.segmentationRepository.updateSegmentStats(segmentId, {
        memberCount: -1,
      });

      this.structuredLogger.log('user_removed_from_segment', {
        segmentId,
        userId,
        segmentName: segment.name,
      });

      this.logger.log(`User removed from segment: ${userId} -> ${segment.name}`);
    } catch (error) {
      this.logger.error(`Failed to remove user from segment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSegmentationStatistics(date?: Date): Promise<SegmentationStatisticsDocument | null> {
    try {
      const targetDate = date || new Date();
      return await this.segmentationRepository.findStatisticsByDate(targetDate);
    } catch (error) {
      this.logger.error(`Failed to get segmentation statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateUserBehaviorProfile(
    userId: string,
    userProfile: any,
    eligibleSegments: any[],
  ): Promise<UserBehaviorProfileDocument> {
    try {
      const behaviorProfile = await this.segmentationRepository.findUserBehaviorProfile(userId);

      if (behaviorProfile) {
        // Update existing profile
        const updatedProfile = await this.segmentationRepository.updateUserBehaviorProfile(userId, {
          behavior: userProfile,
          scores: {
            engagementScore: userProfile.behavior.engagementScore,
            activityScore: this.calculateActivityScore(userProfile),
            preferenceScore: this.calculatePreferenceScore(userProfile),
            temporalScore: this.calculateTemporalScore(userProfile),
            overallScore: this.calculateOverallScore(userProfile),
            lastCalculatedAt: new Date(),
          },
          segments: eligibleSegments.map((segment) => ({
            segmentId: segment.segmentId,
            segmentName: segment.segmentName,
            score: segment.score,
            joinedAt: new Date(),
            lastEvaluatedAt: new Date(),
          })),
        });

        if (!updatedProfile) {
          throw new NotFoundException(`User behavior profile for '${userId}' not found`);
        }

        this.logger.log(`User behavior profile updated: ${userId}`);
        return updatedProfile;
      } else {
        // Create new profile
        const newProfile = await this.segmentationRepository.createUserBehaviorProfile({
          userId,
          behavior: userProfile,
          scores: {
            engagementScore: userProfile.behavior.engagementScore,
            activityScore: this.calculateActivityScore(userProfile),
            preferenceScore: this.calculatePreferenceScore(userProfile),
            temporalScore: this.calculateTemporalScore(userProfile),
            overallScore: this.calculateOverallScore(userProfile),
            lastCalculatedAt: new Date(),
          },
          segments: eligibleSegments.map((segment) => ({
            segmentId: segment.segmentId,
            segmentName: segment.segmentName,
            score: segment.score,
            joinedAt: new Date(),
            lastEvaluatedAt: new Date(),
          })),
          metadata: {},
        });

        this.logger.log(`User behavior profile created: ${userId}`);
        return newProfile;
      }
    } catch (error) {
      this.logger.error(`Failed to update user behavior profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async evaluateSegmentCriteria(
    segment: UserSegmentDocument,
    userProfile: any,
  ): Promise<number> {
    try {
      const { criteria } = segment;
      let score = 0;

      if (criteria.logic === 'AND') {
        // All rules must match
        for (const rule of criteria.rules) {
          const ruleScore = this.evaluateRule(rule, userProfile);
          if (ruleScore === 0) {
            return 0; // AND logic fails if any rule fails
          }
          score += ruleScore * (rule.weight || 1);
        }
      } else if (criteria.logic === 'OR') {
        // At least one rule must match
        let hasMatch = false;
        for (const rule of criteria.rules) {
          const ruleScore = this.evaluateRule(rule, userProfile);
          if (ruleScore > 0) {
            hasMatch = true;
            score += ruleScore * (rule.weight || 1);
          }
        }
        if (!hasMatch) {
          return 0; // OR logic fails if no rules match
        }
      } else if (criteria.logic === 'CUSTOM') {
        // Custom expression evaluation
        score = this.evaluateCustomExpression(
          criteria.customExpression || '',
          criteria.rules,
          userProfile,
        );
      }

      return score;
    } catch (error) {
      this.logger.error(`Failed to evaluate segment criteria: ${error.message}`, error.stack);
      return 0;
    }
  }

  private evaluateRule(rule: any, userProfile: any): number {
    try {
      const { field, operator, value } = rule as any;
      const fieldValue = this.getFieldValue(userProfile, field);

      switch (operator) {
        case TargetingRuleType.EQUALS:
          return fieldValue === value ? 1 : 0;
        case TargetingRuleType.NOT_EQUALS:
          return fieldValue !== value ? 1 : 0;
        case TargetingRuleType.CONTAINS:
          return String(fieldValue).includes(String(value)) ? 1 : 0;
        case TargetingRuleType.NOT_CONTAINS:
          return !String(fieldValue).includes(String(value)) ? 1 : 0;
        case TargetingRuleType.GREATER_THAN:
          return Number(fieldValue) > Number(value) ? 1 : 0;
        case TargetingRuleType.LESS_THAN:
          return Number(fieldValue) < Number(value) ? 1 : 0;
        case TargetingRuleType.GREATER_THAN_OR_EQUAL:
          return Number(fieldValue) >= Number(value) ? 1 : 0;
        case TargetingRuleType.LESS_THAN_OR_EQUAL:
          return Number(fieldValue) <= Number(value) ? 1 : 0;
        case TargetingRuleType.IN:
          return Array.isArray(value) && value.includes(fieldValue) ? 1 : 0;
        case TargetingRuleType.NOT_IN:
          return Array.isArray(value) && !value.includes(fieldValue) ? 1 : 0;
        case TargetingRuleType.REGEX:
          return new RegExp(value).test(String(fieldValue)) ? 1 : 0;
        case TargetingRuleType.DATE_RANGE:
          return this.evaluateDateRange(fieldValue, value) ? 1 : 0;
        case TargetingRuleType.TIME_RANGE:
          return this.evaluateTimeRange(fieldValue, value) ? 1 : 0;
        default:
          return 0;
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate rule: ${error.message}`, error.stack);
      return 0;
    }
  }

  private getFieldValue(userProfile: any, field: string): any {
    const fieldParts = field.split('.');
    let value = userProfile;

    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private evaluateCustomExpression(expression: string, rules: any[], userProfile: any): number {
    // This is a simplified custom expression evaluator
    // In a real implementation, you would use a proper expression parser
    try {
      let result = expression;

      for (let i = 0; i < rules.length; i++) {
        const ruleScore = this.evaluateRule(rules[i], userProfile);
        result = result.replace(new RegExp(`\\$rule${i}`, 'g'), ruleScore.toString());
      }

      // Evaluate the expression (this is a simplified version)
      return eval(result) ? 1 : 0;
    } catch (error) {
      this.logger.error(`Failed to evaluate custom expression: ${error.message}`, error.stack);
      return 0;
    }
  }

  private evaluateDateRange(fieldValue: any, value: any): boolean {
    if (!fieldValue || !value) return false;

    const date = new Date(fieldValue);
    const startDate = new Date(value.start);
    const endDate = new Date(value.end);

    return date >= startDate && date <= endDate;
  }

  private evaluateTimeRange(fieldValue: any, value: any): boolean {
    if (!fieldValue || !value) return false;

    const time = new Date(fieldValue).getHours();
    const startTime = value.start;
    const endTime = value.end;

    return time >= startTime && time <= endTime;
  }

  private generateRecommendedTargeting(eligibleSegments: any[]): any {
    if (eligibleSegments.length === 0) {
      return {
        channels: [],
        categories: [],
        priorities: [],
      };
    }

    // Aggregate targeting from all eligible segments
    const channels = new Set<string>();
    const categories = new Set<string>();
    const priorities = new Set<string>();

    for (const segment of eligibleSegments) {
      segment.targeting.channels.forEach((channel: string) => channels.add(channel));
      segment.targeting.categories.forEach((category: string) => categories.add(category));
      segment.targeting.priorities.forEach((priority: string) => priorities.add(priority));
    }

    return {
      channels: Array.from(channels),
      categories: Array.from(categories),
      priorities: Array.from(priorities),
    };
  }

  private calculateConfidence(eligibleSegments: any[], totalScore: number): number {
    if (eligibleSegments.length === 0) return 0;

    const maxScore = eligibleSegments.length * 10; // Assuming max score per segment is 10
    return Math.min(totalScore / maxScore, 1);
  }

  private calculateActivityScore(userProfile: any): number {
    const { behavior } = userProfile as any;
    const daysSinceLastActive =
      (Date.now() - new Date(behavior.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastActive <= 1) return 1;
    if (daysSinceLastActive <= 7) return 0.8;
    if (daysSinceLastActive <= 30) return 0.5;
    return 0.2;
  }

  private calculatePreferenceScore(userProfile: any): number {
    const { preferences } = userProfile as any;
    const enabledChannels = preferences.channels.filter((c: any) => c.enabled).length;
    const enabledCategories = preferences.categories.filter((c: any) => c.enabled).length;

    return (
      (enabledChannels + enabledCategories) /
      (preferences.channels.length + preferences.categories.length)
    );
  }

  private calculateTemporalScore(userProfile: any): number {
    const { behavior } = userProfile as any;
    const now = new Date();
    const currentHour = now.getHours();

    // Check if current time is within active hours
    if (behavior.temporal && behavior.temporal.activeHours) {
      const { start, end } = behavior.temporal.activeHours;
      if (currentHour >= start && currentHour <= end) {
        return 1;
      }
    }

    return 0.5; // Default score
  }

  private calculateOverallScore(userProfile: any): number {
    const engagementScore = userProfile.behavior.engagementScore;
    const activityScore = this.calculateActivityScore(userProfile);
    const preferenceScore = this.calculatePreferenceScore(userProfile);
    const temporalScore = this.calculateTemporalScore(userProfile);

    return (engagementScore + activityScore + preferenceScore + temporalScore) / 4;
  }

  private validateSegmentData(createDto: CreateUserSegmentDto): void {
    if (!createDto.name || createDto.name.trim().length === 0) {
      throw new BadRequestException('Segment name is required');
    }

    if (!createDto.criteria || !createDto.criteria.rules || createDto.criteria.rules.length === 0) {
      throw new BadRequestException('At least one criteria rule is required');
    }

    if (
      !createDto.targeting ||
      !createDto.targeting.channels ||
      createDto.targeting.channels.length === 0
    ) {
      throw new BadRequestException('At least one targeting channel is required');
    }

    if (!createDto.targeting.categories || createDto.targeting.categories.length === 0) {
      throw new BadRequestException('At least one targeting category is required');
    }

    if (!createDto.targeting.priorities || createDto.targeting.priorities.length === 0) {
      throw new BadRequestException('At least one targeting priority is required');
    }
  }
}
