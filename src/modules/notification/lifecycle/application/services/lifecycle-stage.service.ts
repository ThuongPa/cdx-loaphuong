import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { LifecycleStage } from '../../domain/lifecycle-stage.entity';
import { LifecycleStageRepository } from '../../infrastructure/lifecycle-stage.repository';

export interface CreateLifecycleStageDto {
  name: string;
  description?: string;
  type: 'onboarding' | 'engagement' | 'retention' | 'reactivation' | 'churn_prevention' | 'custom';
  order: number;
  triggers: Array<{
    type:
      | 'user_signup'
      | 'user_login'
      | 'user_inactive'
      | 'user_activity'
      | 'time_based'
      | 'custom';
    config: Record<string, any>;
    delay?: number;
    repeatable?: boolean;
  }>;
  actions: Array<{
    type: 'send_notification' | 'update_user' | 'send_email' | 'create_task' | 'custom';
    config: Record<string, any>;
    delay?: number;
    priority?: number;
  }>;
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
  metadata?: Record<string, any>;
}

export interface UpdateLifecycleStageDto {
  name?: string;
  description?: string;
  type?: 'onboarding' | 'engagement' | 'retention' | 'reactivation' | 'churn_prevention' | 'custom';
  order?: number;
  triggers?: Array<{
    type:
      | 'user_signup'
      | 'user_login'
      | 'user_inactive'
      | 'user_activity'
      | 'time_based'
      | 'custom';
    config: Record<string, any>;
    delay?: number;
    repeatable?: boolean;
  }>;
  actions?: Array<{
    type: 'send_notification' | 'update_user' | 'send_email' | 'create_task' | 'custom';
    config: Record<string, any>;
    delay?: number;
    priority?: number;
  }>;
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
  metadata?: Record<string, any>;
}

export interface LifecycleStageQuery {
  search?: string;
  type?: string;
  isActive?: boolean;
  order?: number;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class LifecycleStageService {
  private readonly logger = new Logger(LifecycleStageService.name);

  constructor(
    @Inject('LifecycleStageRepository')
    private readonly lifecycleStageRepository: LifecycleStageRepository,
  ) {}

  async createLifecycleStage(
    dto: CreateLifecycleStageDto,
    createdBy: string,
  ): Promise<LifecycleStage> {
    this.logger.log(`Creating lifecycle stage: ${dto.name}`);

    try {
      // Validate triggers
      if (!dto.triggers || dto.triggers.length === 0) {
        throw new BadRequestException('Lifecycle stage must have at least one trigger');
      }

      // Validate actions
      if (!dto.actions || dto.actions.length === 0) {
        throw new BadRequestException('Lifecycle stage must have at least one action');
      }

      // Check for duplicate order
      const existingStage = await this.lifecycleStageRepository.findByOrder(dto.order);
      if (existingStage) {
        throw new BadRequestException(`Lifecycle stage with order ${dto.order} already exists`);
      }

      const stage = LifecycleStage.create({
        name: dto.name,
        description: dto.description,
        type: dto.type,
        isActive: true,
        order: dto.order,
        triggers: dto.triggers,
        actions: dto.actions,
        conditions: dto.conditions || [],
        metadata: dto.metadata,
        createdBy,
      });

      const savedStage = await this.lifecycleStageRepository.save(stage);

      this.logger.log(`Lifecycle stage created: ${savedStage.name} (${savedStage.id})`);
      return savedStage;
    } catch (error) {
      this.logger.error(`Failed to create lifecycle stage: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getLifecycleStages(
    query: LifecycleStageQuery = {},
  ): Promise<{ stages: LifecycleStage[]; total: number; page: number; limit: number }> {
    return await this.lifecycleStageRepository.findMany(query);
  }

  async getLifecycleStageById(id: string): Promise<LifecycleStage> {
    const stage = await this.lifecycleStageRepository.findById(id);
    if (!stage) {
      throw new NotFoundException(`Lifecycle stage with ID '${id}' not found`);
    }
    return stage;
  }

  async getLifecycleStageByName(name: string): Promise<LifecycleStage | null> {
    return await this.lifecycleStageRepository.findByName(name);
  }

  async updateLifecycleStage(id: string, dto: UpdateLifecycleStageDto): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);

    // Validate order if changing
    if (dto.order !== undefined && dto.order !== stage.order) {
      const existingStage = await this.lifecycleStageRepository.findByOrder(dto.order);
      if (existingStage && existingStage.id !== id) {
        throw new BadRequestException(`Lifecycle stage with order ${dto.order} already exists`);
      }
    }

    // Validate triggers if provided
    if (dto.triggers && dto.triggers.length === 0) {
      throw new BadRequestException('Lifecycle stage must have at least one trigger');
    }

    // Validate actions if provided
    if (dto.actions && dto.actions.length === 0) {
      throw new BadRequestException('Lifecycle stage must have at least one action');
    }

    stage.updateContent(dto);
    return await this.lifecycleStageRepository.save(stage);
  }

  async deleteLifecycleStage(id: string): Promise<void> {
    const stage = await this.getLifecycleStageById(id);
    await this.lifecycleStageRepository.delete(id);
    this.logger.log(`Lifecycle stage deleted: ${stage.name} (${stage.id})`);
  }

  async activateLifecycleStage(id: string): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);
    stage.activate();
    return await this.lifecycleStageRepository.save(stage);
  }

  async deactivateLifecycleStage(id: string): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);
    stage.deactivate();
    return await this.lifecycleStageRepository.save(stage);
  }

  async getActiveLifecycleStages(): Promise<LifecycleStage[]> {
    return await this.lifecycleStageRepository.findActive();
  }

  async getLifecycleStagesByOrder(): Promise<LifecycleStage[]> {
    return await this.lifecycleStageRepository.findByOrderSequence();
  }

  async getLifecycleStagesByType(type: string): Promise<LifecycleStage[]> {
    return await this.lifecycleStageRepository.findByType(type);
  }

  async addTrigger(id: string, trigger: any): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);
    stage.addTrigger(trigger);
    return await this.lifecycleStageRepository.save(stage);
  }

  async removeTrigger(id: string, index: number): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);
    stage.removeTrigger(index);
    return await this.lifecycleStageRepository.save(stage);
  }

  async addAction(id: string, action: any): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);
    stage.addAction(action);
    return await this.lifecycleStageRepository.save(stage);
  }

  async removeAction(id: string, index: number): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);
    stage.removeAction(index);
    return await this.lifecycleStageRepository.save(stage);
  }

  async addCondition(id: string, condition: any): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);
    stage.addCondition(condition);
    return await this.lifecycleStageRepository.save(stage);
  }

  async removeCondition(id: string, index: number): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);
    stage.removeCondition(index);
    return await this.lifecycleStageRepository.save(stage);
  }

  async updateOrder(id: string, order: number): Promise<LifecycleStage> {
    const stage = await this.getLifecycleStageById(id);

    // Check for duplicate order
    const existingStage = await this.lifecycleStageRepository.findByOrder(order);
    if (existingStage && existingStage.id !== id) {
      throw new BadRequestException(`Lifecycle stage with order ${order} already exists`);
    }

    stage.updateOrder(order);
    return await this.lifecycleStageRepository.save(stage);
  }

  async getLifecycleStagesByUser(userId: string): Promise<LifecycleStage[]> {
    return await this.lifecycleStageRepository.findByUser(userId);
  }

  async searchLifecycleStages(searchTerm: string): Promise<LifecycleStage[]> {
    return await this.lifecycleStageRepository.search(searchTerm);
  }

  async bulkUpdateLifecycleStages(
    updateItems: Array<{ id: string; updates: UpdateLifecycleStageDto }>,
  ): Promise<LifecycleStage[]> {
    const results: LifecycleStage[] = [];

    for (const { id, updates } of updateItems) {
      try {
        const updatedStage = await this.updateLifecycleStage(id, updates);
        results.push(updatedStage);
      } catch (error) {
        this.logger.error(`Failed to update lifecycle stage ${id}: ${error.message}`);
        throw error;
      }
    }

    return results;
  }

  async bulkDeleteLifecycleStages(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.deleteLifecycleStage(id);
      } catch (error) {
        this.logger.error(`Failed to delete lifecycle stage ${id}: ${error.message}`);
        throw error;
      }
    }
  }

  async getLifecycleStageStatistics(id: string): Promise<any> {
    const stage = await this.getLifecycleStageById(id);

    return {
      stage: {
        id: stage.id,
        name: stage.name,
        type: stage.type,
        isActive: stage.isActive,
        order: stage.order,
      },
      statistics: {
        totalTriggers: stage.triggers.length,
        totalActions: stage.actions.length,
        totalConditions: stage.conditions.length,
        lastUpdated: stage.updatedAt,
      },
    };
  }
}
