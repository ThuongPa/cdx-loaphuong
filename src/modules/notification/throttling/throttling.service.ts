import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Document, Types } from 'mongoose';
import { Type } from 'class-transformer';
import { ThrottlingRepository } from './throttling.repository';
import { ThrottlingType, ThrottlingScope } from './throttling.schema';

export enum ThrottlingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}
import {
  ThrottlingRuleDocument,
  UserThrottlingProfileDocument,
  ThrottlingStatisticsDocument,
  ThrottlingRecordDocument,
} from './throttling.schema';
import { StructuredLoggerService } from '../shared/services/structured-logger.service';
// import { ThrottlingRuleSortOptions } from '../../../../common/types/throttling.types';

export interface CreateThrottlingRuleDto {
  name: string;
  description?: string;
  type: ThrottlingType;
  scope: ThrottlingScope;
  limits: {
    maxNotifications: number;
    timeWindowMs: number;
    burstLimit?: number;
    burstWindowMs?: number;
    cooldownMs?: number;
  };
  conditions: {
    channels?: string[];
    categories?: string[];
    priorities?: string[];
    userSegments?: string[];
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      timezone?: string;
      daysOfWeek?: number[];
    };
    customRules?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

export interface UpdateThrottlingRuleDto {
  name?: string;
  description?: string;
  limits?: {
    maxNotifications: number;
    timeWindowMs: number;
    burstLimit?: number;
    burstWindowMs?: number;
    cooldownMs?: number;
  };
  conditions?: {
    channels?: string[];
    categories?: string[];
    priorities?: string[];
    userSegments?: string[];
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      timezone?: string;
      daysOfWeek?: number[];
    };
    customRules?: Record<string, any>;
  };
  status?: ThrottlingStatus;
  metadata?: Record<string, any>;
}

export interface CheckThrottlingDto {
  identifier: string;
  scope: ThrottlingScope;
  notificationData: {
    channel: string;
    category?: string;
    priority?: string;
    userSegment?: string;
    userId?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  metadata?: Record<string, any>;
}

export interface ThrottlingResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  remainingCount?: number;
  resetTime?: Date;
  violation?: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    isBlocked: boolean;
    blockUntil?: Date;
  };
}

export interface CreateUserProfileDto {
  userId: string;
  limits: {
    maxNotificationsPerDay: number;
    maxNotificationsPerHour: number;
    maxNotificationsPerMinute: number;
    maxBurstNotifications: number;
    burstWindowMs: number;
    cooldownMs: number;
  };
  behavior: {
    averageNotificationsPerDay: number;
    peakHour: number;
    preferredChannels: string[];
    engagementScore: number;
    lastActiveAt: Date;
    notificationFrequency: 'low' | 'medium' | 'high' | 'very_high';
  };
  restrictions: {
    quietHours: {
      startTime: string;
      endTime: string;
      timezone: string;
    };
    blockedChannels: string[];
    blockedCategories: string[];
    maxPriority: string;
    emergencyOverride: boolean;
  };
  metadata?: Record<string, any>;
}

@Injectable()
export class ThrottlingService {
  private readonly logger = new Logger(ThrottlingService.name);

  constructor(
    private readonly throttlingRepository: ThrottlingRepository,
    private readonly structuredLogger: StructuredLoggerService,
  ) {}

  async createRule(
    createDto: CreateThrottlingRuleDto,
    createdBy: string,
  ): Promise<ThrottlingRuleDocument> {
    try {
      // Validate rule data
      this.validateRuleData(createDto);

      // Check for duplicate name
      const existingRule = await this.throttlingRepository.findRuleByName(createDto.name);
      if (existingRule) {
        throw new BadRequestException(
          `Throttling rule with name '${createDto.name}' already exists`,
        );
      }

      // Create rule
      const ruleData = {
        ...createDto,
        status: ThrottlingStatus.ACTIVE,
        hitCount: 0,
        blockCount: 0,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rule = await this.throttlingRepository.createRule(ruleData);

      this.structuredLogger.log('throttling_rule_created', {
        ruleId: rule._id,
        ruleName: rule.name,
        ruleType: rule.type,
        ruleScope: rule.scope,
        createdBy,
      });

      this.logger.log(`Throttling rule created: ${rule.name} (${rule._id})`);
      return rule;
    } catch (error) {
      this.logger.error(`Failed to create throttling rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getRuleById(id: string): Promise<ThrottlingRuleDocument> {
    const rule = await this.throttlingRepository.findRuleById(id);
    if (!rule) {
      throw new BadRequestException(`Throttling rule with ID '${id}' not found`);
    }
    return rule;
  }

  async getRules(
    filters: any = {},
    sort: any = { field: 'createdAt', order: 'desc' },
    pagination: any = { page: 1, limit: 10 },
  ): Promise<any> {
    return this.throttlingRepository.findManyRules(filters);
  }

  async updateRule(
    id: string,
    updateDto: UpdateThrottlingRuleDto,
    updatedBy: string,
  ): Promise<ThrottlingRuleDocument> {
    try {
      const rule = await this.getRuleById(id);

      // Validate update data
      if (updateDto.name && updateDto.name !== rule.name) {
        const existingRule = await this.throttlingRepository.findRuleByName(updateDto.name);
        if (existingRule) {
          throw new BadRequestException(
            `Throttling rule with name '${updateDto.name}' already exists`,
          );
        }
      }

      // Update rule
      const updatedRule = await this.throttlingRepository.updateRule(id, {
        ...updateDto,
      });

      if (!updatedRule) {
        throw new BadRequestException(`Throttling rule with ID '${id}' not found`);
      }

      this.structuredLogger.log('throttling_rule_updated', {
        ruleId: id,
        ruleName: updatedRule.name,
        updatedBy,
        changes: Object.keys(updateDto),
      });

      this.logger.log(`Throttling rule updated: ${updatedRule.name} (${id})`);
      return updatedRule;
    } catch (error) {
      this.logger.error(`Failed to update throttling rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteRule(id: string): Promise<void> {
    try {
      const rule = await this.getRuleById(id);

      await this.throttlingRepository.deleteRule(id);

      this.structuredLogger.log('throttling_rule_deleted', {
        ruleId: id,
        ruleName: rule.name,
      });

      this.logger.log(`Throttling rule deleted: ${rule.name} (${id})`);
    } catch (error) {
      this.logger.error(`Failed to delete throttling rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkThrottling(checkDto: CheckThrottlingDto): Promise<ThrottlingResult> {
    try {
      const { identifier, scope, notificationData, metadata } = checkDto;

      // Get applicable rules
      const applicableRules = await this.throttlingRepository.findApplicableRules({
        scope,
        channel: notificationData.channel,
        category: notificationData.category,
        priority: notificationData.priority,
        userSegment: notificationData.userSegment,
      });

      if (applicableRules.length === 0) {
        return { allowed: true };
      }

      // Check each rule
      for (const rule of applicableRules) {
        const result = await this.checkRule(rule, identifier, scope, notificationData, metadata);
        if (!result.allowed) {
          return result;
        }
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error(`Failed to check throttling: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createUserProfile(createDto: CreateUserProfileDto): Promise<UserThrottlingProfileDocument> {
    try {
      // Validate profile data
      this.validateUserProfileData(createDto);

      const profile = await this.throttlingRepository.createUserProfile(createDto);

      this.structuredLogger.log('user_throttling_profile_created', {
        userId: createDto.userId,
        limits: createDto.limits,
        behavior: createDto.behavior,
      });

      this.logger.log(`User throttling profile created for user: ${createDto.userId}`);
      return profile;
    } catch (error) {
      this.logger.error(`Failed to create user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<UserThrottlingProfileDocument | null> {
    return this.throttlingRepository.findUserProfile(userId);
  }

  async updateUserProfile(
    userId: string,
    updateData: Partial<CreateUserProfileDto>,
  ): Promise<UserThrottlingProfileDocument> {
    try {
      const profile = await this.throttlingRepository.updateUserProfile(userId, updateData);

      this.structuredLogger.log('user_throttling_profile_updated', {
        userId,
        changes: Object.keys(updateData),
      });

      this.logger.log(`User throttling profile updated for user: ${userId}`);
      return profile!;
    } catch (error) {
      this.logger.error(`Failed to update user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getThrottlingStatistics(date?: Date): Promise<ThrottlingStatisticsDocument[]> {
    try {
      const targetDate = date || new Date();
      return await this.throttlingRepository.findStatisticsByDate(targetDate);
    } catch (error) {
      this.logger.error(`Failed to get throttling statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async recordThrottlingEvent(
    identifier: string,
    scope: ThrottlingScope,
    eventType: 'request' | 'throttled' | 'blocked',
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.throttlingRepository.recordEvent({ identifier, scope, eventType, metadata });

      this.structuredLogger.log('throttling_event_recorded', {
        identifier,
        scope,
        eventType,
        metadata,
      });
    } catch (error) {
      this.logger.error(`Failed to record throttling event: ${error.message}`, error.stack);
    }
  }

  async cleanupOldRecords(daysOld: number = 30): Promise<number> {
    try {
      const deletedCount = await this.throttlingRepository.cleanupOldRecords();
      this.logger.log(`Cleaned up ${deletedCount} old throttling records`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup old records: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async checkRule(
    rule: ThrottlingRuleDocument,
    identifier: string,
    scope: ThrottlingScope,
    notificationData: any,
    metadata?: Record<string, any>,
  ): Promise<ThrottlingResult> {
    try {
      // Check time restrictions
      if (rule.conditions?.timeRestrictions) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        if (
          rule.conditions?.timeRestrictions?.startTime &&
          rule.conditions?.timeRestrictions?.endTime
        ) {
          const startHour = parseInt(rule.conditions.timeRestrictions.startTime.split(':')[0]);
          const endHour = parseInt(rule.conditions.timeRestrictions.endTime.split(':')[0]);

          if (currentHour < startHour || currentHour > endHour) {
            return {
              allowed: false,
              reason: 'Time restriction violation',
              retryAfter: this.calculateRetryAfter(now, startHour),
            };
          }
        }

        if (
          rule.conditions?.timeRestrictions?.daysOfWeek &&
          !rule.conditions.timeRestrictions.daysOfWeek.includes(currentDay)
        ) {
          return {
            allowed: false,
            reason: 'Day restriction violation',
            retryAfter: this.calculateRetryAfter(now, 0, 1), // Next day
          };
        }
      }

      // Get or create throttling record
      const record = (await this.throttlingRepository.getOrCreateRecord(
        rule._id?.toString() || '',
        identifier,
      )) as any;

      // Check basic limits
      const now = new Date();
      const timeWindowStart = new Date(now.getTime() - rule.limits.timeWindowMs);

      if (record.counters?.timeWindowStart < timeWindowStart) {
        // Reset time window
        record.counters!.timeWindowStart = now;
        record.counters!.totalNotifications = 0;
      }

      if (record.counters?.totalNotifications >= rule.limits.maxNotifications) {
        // Update rule statistics
        await this.throttlingRepository.updateRuleStats(rule._id?.toString() || '', {
          hitCount: 1,
          lastHitAt: now,
        });

        // Record violation
        await this.recordViolation(rule, identifier, scope, 'rate_limit_exceeded', {
          attemptedCount: record.counters.totalNotifications + 1,
          allowedCount: rule.limits.maxNotifications,
          timeWindow: rule.limits.timeWindowMs,
        });

        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          retryAfter:
            rule.limits.timeWindowMs - (now.getTime() - record.counters.timeWindowStart.getTime()),
          remainingCount: 0,
          resetTime: new Date(record.counters.timeWindowStart.getTime() + rule.limits.timeWindowMs),
        };
      }

      // Check burst limits
      if (rule.limits.burstLimit && rule.limits.burstWindowMs) {
        const burstWindowStart = new Date(now.getTime() - rule.limits.burstWindowMs);

        if (
          !record.counters?.burstWindowStart ||
          record.counters.burstWindowStart < burstWindowStart
        ) {
          // Reset burst window
          record.counters!.burstWindowStart = now;
          record.counters!.burstCount = 0;
        }

        if (record.counters?.burstCount >= rule.limits.burstLimit) {
          // Update rule statistics
          await this.throttlingRepository.updateRuleStats(rule._id?.toString() || '', {
            hitCount: 1,
            lastHitAt: now,
          });

          // Record violation
          await this.recordViolation(rule, identifier, scope, 'burst_limit_exceeded', {
            attemptedCount: record.counters.burstCount + 1,
            allowedCount: rule.limits.burstLimit,
            timeWindow: rule.limits.burstWindowMs,
          });

          return {
            allowed: false,
            reason: 'Burst limit exceeded',
            retryAfter:
              rule.limits.burstWindowMs -
              (now.getTime() - record.counters.burstWindowStart.getTime()),
            remainingCount: 0,
            resetTime: new Date(
              record.counters.burstWindowStart.getTime() + rule.limits.burstWindowMs,
            ),
          };
        }
      }

      // Check cooldown
      if (
        rule.limits.cooldownMs &&
        record.counters.cooldownUntil &&
        record.counters.cooldownUntil > now
      ) {
        return {
          allowed: false,
          reason: 'Cooldown period active',
          retryAfter: record.counters.cooldownUntil.getTime() - now.getTime(),
          remainingCount: 0,
          resetTime: record.counters.cooldownUntil,
        };
      }

      // Update counters
      record.counters!.totalNotifications += 1;
      record.counters!.lastNotificationAt = now;

      if (rule.limits.burstLimit && rule.limits.burstWindowMs) {
        record.counters!.burstCount += 1;
      }

      if (rule.limits.cooldownMs) {
        record.counters!.cooldownUntil = new Date(now.getTime() + rule.limits.cooldownMs);
      }

      await this.throttlingRepository.updateRecord(record._id?.toString() || '', record.counters);

      return {
        allowed: true,
        remainingCount: rule.limits.maxNotifications - record.counters.totalNotifications,
        resetTime: new Date(record.counters.timeWindowStart.getTime() + rule.limits.timeWindowMs),
      };
    } catch (error) {
      this.logger.error(`Failed to check rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async recordViolation(
    rule: ThrottlingRuleDocument,
    identifier: string,
    scope: ThrottlingScope,
    violationType: string,
    violationData: any,
  ): Promise<void> {
    try {
      const severity = this.calculateSeverity(violationData);
      const isBlocked = severity === 'critical' || severity === 'high';

      const violation = await this.throttlingRepository.createViolation({
        key: `${rule._id}:${identifier}`,
        identifier,
        scope,
        ruleId: rule._id?.toString() || '',
        violationType,
        violationData,
        severity,
        isBlocked,
        blockUntil: isBlocked ? new Date(Date.now() + 3600000) : undefined, // 1 hour block
        metadata: {
          ruleName: rule.name,
          ruleType: rule.type,
        },
      });

      this.structuredLogger.log('throttling_violation_recorded', {
        violationId: violation._id,
        ruleId: rule._id,
        identifier,
        scope,
        violationType,
        severity,
        isBlocked,
      });

      this.logger.warn(
        `Throttling violation recorded: ${violationType} for ${identifier} (severity: ${severity})`,
      );
    } catch (error) {
      this.logger.error(`Failed to record violation: ${error.message}`, error.stack);
    }
  }

  private calculateSeverity(violationData: any): 'low' | 'medium' | 'high' | 'critical' {
    const { attemptedCount, allowedCount } = violationData;
    const ratio = attemptedCount / allowedCount;

    if (ratio >= 5) return 'critical';
    if (ratio >= 3) return 'high';
    if (ratio >= 2) return 'medium';
    return 'low';
  }

  private calculateRetryAfter(now: Date, targetHour: number, daysOffset: number = 0): number {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysOffset);
    targetDate.setHours(targetHour, 0, 0, 0);

    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    return targetDate.getTime() - now.getTime();
  }

  private validateRuleData(createDto: CreateThrottlingRuleDto): void {
    if (!createDto.name || createDto.name.trim().length === 0) {
      throw new BadRequestException('Rule name is required');
    }

    if (!createDto.limits || createDto.limits.maxNotifications < 1) {
      throw new BadRequestException('Max notifications must be at least 1');
    }

    if (!createDto.limits.timeWindowMs || createDto.limits.timeWindowMs < 1000) {
      throw new BadRequestException('Time window must be at least 1000ms');
    }

    if (
      createDto.limits.burstLimit &&
      createDto.limits.burstLimit > createDto.limits.maxNotifications
    ) {
      throw new BadRequestException('Burst limit cannot exceed max notifications');
    }

    if (
      createDto.limits.burstWindowMs &&
      createDto.limits.burstWindowMs > createDto.limits.timeWindowMs
    ) {
      throw new BadRequestException('Burst window cannot exceed time window');
    }
  }

  private validateUserProfileData(createDto: CreateUserProfileDto): void {
    if (!createDto.userId || createDto.userId.trim().length === 0) {
      throw new BadRequestException('User ID is required');
    }

    if (!createDto.limits || createDto.limits.maxNotificationsPerDay < 1) {
      throw new BadRequestException('Max notifications per day must be at least 1');
    }

    if (createDto.limits.maxNotificationsPerHour > createDto.limits.maxNotificationsPerDay) {
      throw new BadRequestException('Hourly limit cannot exceed daily limit');
    }

    if (createDto.limits.maxNotificationsPerMinute > createDto.limits.maxNotificationsPerHour) {
      throw new BadRequestException('Minute limit cannot exceed hourly limit');
    }

    if (createDto.behavior.engagementScore < 0 || createDto.behavior.engagementScore > 1) {
      throw new BadRequestException('Engagement score must be between 0 and 1');
    }

    if (createDto.behavior.peakHour < 0 || createDto.behavior.peakHour > 23) {
      throw new BadRequestException('Peak hour must be between 0 and 23');
    }
  }
}
