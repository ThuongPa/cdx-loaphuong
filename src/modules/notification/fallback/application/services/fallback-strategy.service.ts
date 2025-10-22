import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { FallbackStrategy } from '../../domain/fallback-strategy.entity';
import { FallbackStrategyRepository } from '../../infrastructure/fallback-strategy.repository';

export interface CreateFallbackStrategyDto {
  name: string;
  description?: string;
  priority: number;
  conditions: Array<{
    type: 'channel_failure' | 'provider_failure' | 'rate_limit' | 'timeout' | 'custom';
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
    value: any;
    field?: string;
  }>;
  actions: Array<{
    type: 'retry' | 'alternative_channel' | 'alternative_provider' | 'escalate' | 'custom';
    config: Record<string, any>;
    delay?: number;
    maxAttempts?: number;
  }>;
  metadata?: Record<string, any>;
}

export interface UpdateFallbackStrategyDto {
  name?: string;
  description?: string;
  priority?: number;
  conditions?: Array<{
    type: 'channel_failure' | 'provider_failure' | 'rate_limit' | 'timeout' | 'custom';
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
    value: any;
    field?: string;
  }>;
  actions?: Array<{
    type: 'retry' | 'alternative_channel' | 'alternative_provider' | 'escalate' | 'custom';
    config: Record<string, any>;
    delay?: number;
    maxAttempts?: number;
  }>;
  metadata?: Record<string, any>;
}

export interface FallbackStrategyQuery {
  search?: string;
  isActive?: boolean;
  priority?: number;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class FallbackStrategyService {
  private readonly logger = new Logger(FallbackStrategyService.name);

  constructor(
    @Inject('FallbackStrategyRepository')
    private readonly fallbackStrategyRepository: FallbackStrategyRepository,
  ) {}

  async createFallbackStrategy(
    dto: CreateFallbackStrategyDto,
    createdBy: string,
  ): Promise<FallbackStrategy> {
    this.logger.log(`Creating fallback strategy: ${dto.name}`);

    try {
      // Validate conditions
      if (!dto.conditions || dto.conditions.length === 0) {
        throw new BadRequestException('Fallback strategy must have at least one condition');
      }

      // Validate actions
      if (!dto.actions || dto.actions.length === 0) {
        throw new BadRequestException('Fallback strategy must have at least one action');
      }

      // Check for duplicate priority
      const existingStrategy = await this.fallbackStrategyRepository.findByPriority(dto.priority);
      if (existingStrategy) {
        throw new BadRequestException(
          `Fallback strategy with priority ${dto.priority} already exists`,
        );
      }

      const strategy = FallbackStrategy.create({
        name: dto.name,
        description: dto.description,
        isActive: true,
        priority: dto.priority,
        conditions: dto.conditions,
        actions: dto.actions,
        metadata: dto.metadata,
        createdBy,
      });

      const savedStrategy = await this.fallbackStrategyRepository.save(strategy);

      this.logger.log(`Fallback strategy created: ${savedStrategy.name} (${savedStrategy.id})`);
      return savedStrategy;
    } catch (error) {
      this.logger.error(`Failed to create fallback strategy: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getFallbackStrategies(
    query: FallbackStrategyQuery = {},
  ): Promise<{ strategies: FallbackStrategy[]; total: number; page: number; limit: number }> {
    return await this.fallbackStrategyRepository.findMany(query);
  }

  async getFallbackStrategyById(id: string): Promise<FallbackStrategy> {
    const strategy = await this.fallbackStrategyRepository.findById(id);
    if (!strategy) {
      throw new NotFoundException(`Fallback strategy with ID '${id}' not found`);
    }
    return strategy;
  }

  async getFallbackStrategyByName(name: string): Promise<FallbackStrategy | null> {
    return await this.fallbackStrategyRepository.findByName(name);
  }

  async updateFallbackStrategy(
    id: string,
    dto: UpdateFallbackStrategyDto,
  ): Promise<FallbackStrategy> {
    const strategy = await this.getFallbackStrategyById(id);

    // Validate priority if changing
    if (dto.priority !== undefined && dto.priority !== strategy.priority) {
      const existingStrategy = await this.fallbackStrategyRepository.findByPriority(dto.priority);
      if (existingStrategy && existingStrategy.id !== id) {
        throw new BadRequestException(
          `Fallback strategy with priority ${dto.priority} already exists`,
        );
      }
    }

    // Validate conditions if provided
    if (dto.conditions && dto.conditions.length === 0) {
      throw new BadRequestException('Fallback strategy must have at least one condition');
    }

    // Validate actions if provided
    if (dto.actions && dto.actions.length === 0) {
      throw new BadRequestException('Fallback strategy must have at least one action');
    }

    strategy.updateContent(dto);
    return await this.fallbackStrategyRepository.save(strategy);
  }

  async deleteFallbackStrategy(id: string): Promise<void> {
    const strategy = await this.getFallbackStrategyById(id);
    await this.fallbackStrategyRepository.delete(id);
    this.logger.log(`Fallback strategy deleted: ${strategy.name} (${strategy.id})`);
  }

  async activateFallbackStrategy(id: string): Promise<FallbackStrategy> {
    const strategy = await this.getFallbackStrategyById(id);
    strategy.activate();
    return await this.fallbackStrategyRepository.save(strategy);
  }

  async deactivateFallbackStrategy(id: string): Promise<FallbackStrategy> {
    const strategy = await this.getFallbackStrategyById(id);
    strategy.deactivate();
    return await this.fallbackStrategyRepository.save(strategy);
  }

  async getActiveFallbackStrategies(): Promise<FallbackStrategy[]> {
    return await this.fallbackStrategyRepository.findActive();
  }

  async getFallbackStrategiesByPriority(): Promise<FallbackStrategy[]> {
    return await this.fallbackStrategyRepository.findByPriorityOrder();
  }

  async addCondition(id: string, condition: any): Promise<FallbackStrategy> {
    const strategy = await this.getFallbackStrategyById(id);
    strategy.addCondition(condition);
    return await this.fallbackStrategyRepository.save(strategy);
  }

  async removeCondition(id: string, index: number): Promise<FallbackStrategy> {
    const strategy = await this.getFallbackStrategyById(id);
    strategy.removeCondition(index);
    return await this.fallbackStrategyRepository.save(strategy);
  }

  async addAction(id: string, action: any): Promise<FallbackStrategy> {
    const strategy = await this.getFallbackStrategyById(id);
    strategy.addAction(action);
    return await this.fallbackStrategyRepository.save(strategy);
  }

  async removeAction(id: string, index: number): Promise<FallbackStrategy> {
    const strategy = await this.getFallbackStrategyById(id);
    strategy.removeAction(index);
    return await this.fallbackStrategyRepository.save(strategy);
  }

  async updatePriority(id: string, priority: number): Promise<FallbackStrategy> {
    const strategy = await this.getFallbackStrategyById(id);

    // Check for duplicate priority
    const existingStrategy = await this.fallbackStrategyRepository.findByPriority(priority);
    if (existingStrategy && existingStrategy.id !== id) {
      throw new BadRequestException(`Fallback strategy with priority ${priority} already exists`);
    }

    strategy.updatePriority(priority);
    return await this.fallbackStrategyRepository.save(strategy);
  }

  async getFallbackStrategiesByUser(userId: string): Promise<FallbackStrategy[]> {
    return await this.fallbackStrategyRepository.findByUser(userId);
  }

  async searchFallbackStrategies(searchTerm: string): Promise<FallbackStrategy[]> {
    return await this.fallbackStrategyRepository.search(searchTerm);
  }

  async bulkUpdateFallbackStrategies(
    updateItems: Array<{ id: string; updates: UpdateFallbackStrategyDto }>,
  ): Promise<FallbackStrategy[]> {
    const results: FallbackStrategy[] = [];

    for (const { id, updates } of updateItems) {
      try {
        const updatedStrategy = await this.updateFallbackStrategy(id, updates);
        results.push(updatedStrategy);
      } catch (error) {
        this.logger.error(`Failed to update fallback strategy ${id}: ${error.message}`);
        throw error;
      }
    }

    return results;
  }

  async bulkDeleteFallbackStrategies(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.deleteFallbackStrategy(id);
      } catch (error) {
        this.logger.error(`Failed to delete fallback strategy ${id}: ${error.message}`);
        throw error;
      }
    }
  }

  async getFallbackStrategyStatistics(id: string): Promise<any> {
    const strategy = await this.getFallbackStrategyById(id);

    return {
      strategy: {
        id: strategy.id,
        name: strategy.name,
        isActive: strategy.isActive,
        priority: strategy.priority,
      },
      statistics: {
        totalConditions: strategy.conditions.length,
        totalActions: strategy.actions.length,
        lastUpdated: strategy.updatedAt,
      },
    };
  }
}
