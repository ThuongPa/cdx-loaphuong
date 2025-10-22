import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { MultiProvider } from '../../domain/multi-provider.entity';
import { MultiProviderRepository } from '../../infrastructure/multi-provider.repository';

export interface CreateMultiProviderDto {
  name: string;
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'discord' | 'teams' | 'custom';
  config: Record<string, any>;
  priority: number;
  fallbackProviders?: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
  retryConfig?: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    baseDelay: number;
  };
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoint?: string;
  };
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface UpdateMultiProviderDto {
  name?: string;
  config?: Record<string, any>;
  priority?: number;
  fallbackProviders?: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
  retryConfig?: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    baseDelay: number;
  };
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoint?: string;
  };
  metadata?: Record<string, any>;
  updatedBy: string;
}

export interface MultiProviderFilters {
  name?: string;
  type?: string;
  isActive?: boolean;
  priority?: number;
  limit?: number;
  offset?: number;
}

@Injectable()
export class MultiProviderService {
  private readonly logger = new Logger(MultiProviderService.name);

  constructor(
    @Inject('MultiProviderRepository')
    private readonly multiProviderRepository: MultiProviderRepository,
  ) {}

  async createMultiProvider(createDto: CreateMultiProviderDto): Promise<MultiProvider> {
    this.logger.log(`Creating multi-provider ${createDto.name}`);

    if (!createDto.name || !createDto.type) {
      throw new BadRequestException('Name and type are required');
    }

    if (createDto.priority < 0) {
      throw new BadRequestException('Priority must be non-negative');
    }

    const multiProvider = MultiProvider.create({
      name: createDto.name,
      type: createDto.type,
      config: createDto.config,
      isActive: true,
      priority: createDto.priority,
      fallbackProviders: createDto.fallbackProviders,
      rateLimit: createDto.rateLimit,
      retryConfig: createDto.retryConfig,
      healthCheck: createDto.healthCheck,
      metadata: createDto.metadata,
    });

    return this.multiProviderRepository.create(multiProvider);
  }

  async getMultiProviderById(id: string): Promise<MultiProvider> {
    const multiProvider = await this.multiProviderRepository.findById(id);
    if (!multiProvider) {
      throw new NotFoundException(`Multi-provider with ID ${id} not found`);
    }
    return multiProvider;
  }

  async getMultiProviderByName(name: string): Promise<MultiProvider> {
    const multiProvider = await this.multiProviderRepository.findByName(name);
    if (!multiProvider) {
      throw new NotFoundException(`Multi-provider with name ${name} not found`);
    }
    return multiProvider;
  }

  async getMultiProviders(filters: MultiProviderFilters = {}): Promise<{
    multiProviders: MultiProvider[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.multiProviderRepository.find(filters);
    return result;
  }

  async updateMultiProvider(id: string, updateDto: UpdateMultiProviderDto): Promise<MultiProvider> {
    this.logger.log(`Updating multi-provider ${id}`);

    const multiProvider = await this.getMultiProviderById(id);

    if (updateDto.name !== undefined) {
      multiProvider.updateConfig({ ...multiProvider.config, name: updateDto.name });
    }

    if (updateDto.config !== undefined) {
      multiProvider.updateConfig(updateDto.config);
    }

    if (updateDto.priority !== undefined) {
      multiProvider.updatePriority(updateDto.priority);
    }

    if (updateDto.fallbackProviders !== undefined) {
      multiProvider.updateFallbackProviders(updateDto.fallbackProviders);
    }

    if (updateDto.rateLimit !== undefined) {
      multiProvider.updateRateLimit(updateDto.rateLimit);
    }

    if (updateDto.retryConfig !== undefined) {
      multiProvider.updateRetryConfig(updateDto.retryConfig);
    }

    if (updateDto.healthCheck !== undefined) {
      multiProvider.updateHealthCheck(updateDto.healthCheck);
    }

    if (updateDto.metadata !== undefined) {
      multiProvider.updateMetadata(updateDto.metadata);
    }

    return this.multiProviderRepository.update(id, multiProvider);
  }

  async deleteMultiProvider(id: string): Promise<void> {
    this.logger.log(`Deleting multi-provider ${id}`);

    const multiProvider = await this.getMultiProviderById(id);
    await this.multiProviderRepository.delete(id);
  }

  async getMultiProvidersByType(type: string): Promise<MultiProvider[]> {
    return this.multiProviderRepository.findByType(type);
  }

  async getActiveMultiProviders(): Promise<MultiProvider[]> {
    return this.multiProviderRepository.findActive();
  }

  async getMultiProvidersByPriority(): Promise<MultiProvider[]> {
    return this.multiProviderRepository.findByPriority();
  }

  async activateMultiProvider(id: string): Promise<MultiProvider> {
    this.logger.log(`Activating multi-provider ${id}`);

    const multiProvider = await this.getMultiProviderById(id);
    multiProvider.activate();
    return this.multiProviderRepository.update(id, multiProvider);
  }

  async deactivateMultiProvider(id: string): Promise<MultiProvider> {
    this.logger.log(`Deactivating multi-provider ${id}`);

    const multiProvider = await this.getMultiProviderById(id);
    multiProvider.deactivate();
    return this.multiProviderRepository.update(id, multiProvider);
  }

  async getMultiProviderHealth(id: string): Promise<{
    isHealthy: boolean;
    status: string;
    lastCheck: Date;
    responseTime: number;
    errorRate: number;
  }> {
    const multiProvider = await this.getMultiProviderById(id);

    // This would typically check the actual health of the provider
    // For now, return a mock health status
    return {
      isHealthy: true,
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: 100,
      errorRate: 0.01,
    };
  }

  async getMultiProviderStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    active: number;
    inactive: number;
    averagePriority: number;
  }> {
    return this.multiProviderRepository.getStatistics();
  }

  async bulkUpdateMultiProviders(
    updateItems: Array<{ id: string; updates: UpdateMultiProviderDto }>,
  ): Promise<MultiProvider[]> {
    const results: MultiProvider[] = [];

    for (const { id, updates } of updateItems) {
      try {
        const updatedProvider = await this.updateMultiProvider(id, updates);
        results.push(updatedProvider);
      } catch (error) {
        this.logger.error(`Failed to update multi-provider ${id}: ${error.message}`);
        throw error;
      }
    }

    return results;
  }

  async exportMultiProviders(
    filters: MultiProviderFilters,
    format: 'json' | 'csv' | 'excel' = 'json',
  ): Promise<{
    data: any;
    format: string;
    count: number;
    timestamp: Date;
  }> {
    this.logger.log(`Exporting multi-providers in ${format} format`);

    const result = await this.multiProviderRepository.export(filters, format);
    return result;
  }
}
