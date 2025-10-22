import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ThrottleRule } from '../../domain/throttle-rule.entity';
import { ThrottleRuleRepository } from '../../infrastructure/throttle-rule.repository';

export interface CreateThrottleRuleDto {
  name: string;
  description?: string;
  type: 'rate_limit' | 'burst_limit' | 'time_window' | 'user_based' | 'channel_based';
  conditions: Array<{
    field: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'greater_than'
      | 'less_than'
      | 'contains'
      | 'regex'
      | 'in'
      | 'not_in';
    value: any;
    logic?: 'and' | 'or';
  }>;
  limits: Array<{
    window: number;
    maxCount: number;
    scope: 'user' | 'global' | 'channel' | 'type';
    action: 'block' | 'delay' | 'queue' | 'skip';
  }>;
  metadata?: Record<string, any>;
}

export interface UpdateThrottleRuleDto {
  name?: string;
  description?: string;
  type?: 'rate_limit' | 'burst_limit' | 'time_window' | 'user_based' | 'channel_based';
  conditions?: Array<{
    field: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'greater_than'
      | 'less_than'
      | 'contains'
      | 'regex'
      | 'in'
      | 'not_in';
    value: any;
    logic?: 'and' | 'or';
  }>;
  limits?: Array<{
    window: number;
    maxCount: number;
    scope: 'user' | 'global' | 'channel' | 'type';
    action: 'block' | 'delay' | 'queue' | 'skip';
  }>;
  metadata?: Record<string, any>;
}

export interface ThrottleRuleQuery {
  search?: string;
  type?: string;
  isActive?: boolean;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ThrottleRuleService {
  private readonly logger = new Logger(ThrottleRuleService.name);

  constructor(
    @Inject('ThrottleRuleRepository')
    private readonly throttleRuleRepository: ThrottleRuleRepository,
  ) {}

  async createThrottleRule(dto: CreateThrottleRuleDto, createdBy: string): Promise<ThrottleRule> {
    this.logger.log(`Creating throttle rule: ${dto.name}`);

    try {
      // Validate conditions
      if (!dto.conditions || dto.conditions.length === 0) {
        throw new BadRequestException('Throttle rule must have at least one condition');
      }

      // Validate limits
      if (!dto.limits || dto.limits.length === 0) {
        throw new BadRequestException('Throttle rule must have at least one limit');
      }

      const rule = ThrottleRule.create({
        name: dto.name,
        description: dto.description,
        isActive: true,
        type: dto.type,
        conditions: dto.conditions,
        limits: dto.limits,
        metadata: dto.metadata,
        createdBy,
      });

      const savedRule = await this.throttleRuleRepository.save(rule);

      this.logger.log(`Throttle rule created: ${savedRule.name} (${savedRule.id})`);
      return savedRule;
    } catch (error) {
      this.logger.error(`Failed to create throttle rule: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getThrottleRules(
    query: ThrottleRuleQuery = {},
  ): Promise<{ rules: ThrottleRule[]; total: number; page: number; limit: number }> {
    return await this.throttleRuleRepository.findMany(query);
  }

  async getThrottleRuleById(id: string): Promise<ThrottleRule> {
    const rule = await this.throttleRuleRepository.findById(id);
    if (!rule) {
      throw new NotFoundException(`Throttle rule with ID '${id}' not found`);
    }
    return rule;
  }

  async getThrottleRuleByName(name: string): Promise<ThrottleRule | null> {
    return await this.throttleRuleRepository.findByName(name);
  }

  async updateThrottleRule(id: string, dto: UpdateThrottleRuleDto): Promise<ThrottleRule> {
    const rule = await this.getThrottleRuleById(id);

    // Validate conditions if provided
    if (dto.conditions && dto.conditions.length === 0) {
      throw new BadRequestException('Throttle rule must have at least one condition');
    }

    // Validate limits if provided
    if (dto.limits && dto.limits.length === 0) {
      throw new BadRequestException('Throttle rule must have at least one limit');
    }

    rule.updateContent(dto);
    return await this.throttleRuleRepository.save(rule);
  }

  async deleteThrottleRule(id: string): Promise<void> {
    const rule = await this.getThrottleRuleById(id);
    await this.throttleRuleRepository.delete(id);
    this.logger.log(`Throttle rule deleted: ${rule.name} (${rule.id})`);
  }

  async activateThrottleRule(id: string): Promise<ThrottleRule> {
    const rule = await this.getThrottleRuleById(id);
    rule.activate();
    return await this.throttleRuleRepository.save(rule);
  }

  async deactivateThrottleRule(id: string): Promise<ThrottleRule> {
    const rule = await this.getThrottleRuleById(id);
    rule.deactivate();
    return await this.throttleRuleRepository.save(rule);
  }

  async getActiveThrottleRules(): Promise<ThrottleRule[]> {
    return await this.throttleRuleRepository.findActive();
  }

  async getThrottleRulesByType(type: string): Promise<ThrottleRule[]> {
    return await this.throttleRuleRepository.findByType(type);
  }

  async addCondition(id: string, condition: any): Promise<ThrottleRule> {
    const rule = await this.getThrottleRuleById(id);
    rule.addCondition(condition);
    return await this.throttleRuleRepository.save(rule);
  }

  async removeCondition(id: string, index: number): Promise<ThrottleRule> {
    const rule = await this.getThrottleRuleById(id);
    rule.removeCondition(index);
    return await this.throttleRuleRepository.save(rule);
  }

  async addLimit(id: string, limit: any): Promise<ThrottleRule> {
    const rule = await this.getThrottleRuleById(id);
    rule.addLimit(limit);
    return await this.throttleRuleRepository.save(rule);
  }

  async removeLimit(id: string, index: number): Promise<ThrottleRule> {
    const rule = await this.getThrottleRuleById(id);
    rule.removeLimit(index);
    return await this.throttleRuleRepository.save(rule);
  }

  async getThrottleRulesByUser(userId: string): Promise<ThrottleRule[]> {
    return await this.throttleRuleRepository.findByUser(userId);
  }

  async searchThrottleRules(searchTerm: string): Promise<ThrottleRule[]> {
    return await this.throttleRuleRepository.search(searchTerm);
  }

  async bulkUpdateThrottleRules(
    updateItems: Array<{ id: string; updates: UpdateThrottleRuleDto }>,
  ): Promise<ThrottleRule[]> {
    const results: ThrottleRule[] = [];

    for (const { id, updates } of updateItems) {
      try {
        const updatedRule = await this.updateThrottleRule(id, updates);
        results.push(updatedRule);
      } catch (error) {
        this.logger.error(`Failed to update throttle rule ${id}: ${error.message}`);
        throw error;
      }
    }

    return results;
  }

  async bulkDeleteThrottleRules(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.deleteThrottleRule(id);
      } catch (error) {
        this.logger.error(`Failed to delete throttle rule ${id}: ${error.message}`);
        throw error;
      }
    }
  }

  async getThrottleRuleStatistics(id: string): Promise<any> {
    const rule = await this.getThrottleRuleById(id);

    return {
      rule: {
        id: rule.id,
        name: rule.name,
        type: rule.type,
        isActive: rule.isActive,
      },
      statistics: {
        totalConditions: rule.conditions.length,
        totalLimits: rule.limits.length,
        lastUpdated: rule.updatedAt,
      },
    };
  }
}
