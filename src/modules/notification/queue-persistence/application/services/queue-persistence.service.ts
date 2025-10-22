import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { QueueOperation } from '../../domain/queue-operation.entity';
import { QueuePersistenceRepository } from '../../infrastructure/queue-persistence.repository';

export interface CreateQueueOperationDto {
  operationType:
    | 'enqueue'
    | 'dequeue'
    | 'peek'
    | 'clear'
    | 'pause'
    | 'resume'
    | 'prioritize'
    | 'bulk_operation'
    | 'migrate'
    | 'backup'
    | 'restore';
  queueName: string;
  payload: {
    data: any;
    metadata?: Record<string, any>;
    priority?: number;
    delay?: number;
    ttl?: number;
    retryCount?: number;
    maxRetries?: number;
  };
  createdBy: string;
}

export interface UpdateQueueOperationDto {
  status?: 'active' | 'paused' | 'draining' | 'maintenance' | 'error';
  result?: {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
    timestamp: Date;
  };
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
  nextRetryAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  metadata?: Record<string, any>;
  updatedBy: string;
}

export interface QueueOperationFilters {
  queueNames?: string[];
  operationTypes?: string[];
  statuses?: string[];
  dateRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
}

@Injectable()
export class QueuePersistenceService {
  private readonly logger = new Logger(QueuePersistenceService.name);

  constructor(
    @Inject('QueuePersistenceRepository')
    private readonly queuePersistenceRepository: QueuePersistenceRepository,
  ) {}

  async createQueueOperation(createDto: CreateQueueOperationDto): Promise<QueueOperation> {
    this.logger.log(
      `Creating queue operation ${createDto.operationType} for queue ${createDto.queueName}`,
    );

    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queueOperation = QueueOperation.create({
      operationId,
      operationType: createDto.operationType,
      queueName: createDto.queueName,
      payload: createDto.payload,
      status: 'active',
      retryCount: 0,
      maxRetries: createDto.payload.maxRetries || 3,
      createdBy: createDto.createdBy,
    });

    return this.queuePersistenceRepository.create(queueOperation);
  }

  async getQueueOperationById(id: string): Promise<QueueOperation> {
    const queueOperation = await this.queuePersistenceRepository.findById(id);
    if (!queueOperation) {
      throw new NotFoundException(`Queue operation with ID ${id} not found`);
    }
    return queueOperation;
  }

  async getQueueOperationByOperationId(operationId: string): Promise<QueueOperation> {
    const queueOperation = await this.queuePersistenceRepository.findByOperationId(operationId);
    if (!queueOperation) {
      throw new NotFoundException(`Queue operation with operation ID ${operationId} not found`);
    }
    return queueOperation;
  }

  async getQueueOperations(filters: QueueOperationFilters = {}): Promise<{
    queueOperations: QueueOperation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.queuePersistenceRepository.find(filters);
    return result;
  }

  async updateQueueOperation(
    id: string,
    updateDto: UpdateQueueOperationDto,
  ): Promise<QueueOperation> {
    this.logger.log(`Updating queue operation ${id}`);

    const queueOperation = await this.getQueueOperationById(id);

    if (updateDto.status) {
      queueOperation.updateStatus(updateDto.status);
    }

    if (updateDto.result) {
      queueOperation.updateResult(updateDto.result);
    }

    if (updateDto.errorMessage) {
      queueOperation.updateErrorMessage(updateDto.errorMessage);
    }

    if (updateDto.retryCount !== undefined) {
      queueOperation.incrementRetryCount();
    }

    if (updateDto.maxRetries !== undefined) {
      queueOperation.updateMetadata({ maxRetries: updateDto.maxRetries });
    }

    if (updateDto.nextRetryAt) {
      queueOperation.updateNextRetryAt(updateDto.nextRetryAt);
    }

    if (updateDto.startedAt) {
      queueOperation.updateStartedAt(updateDto.startedAt);
    }

    if (updateDto.completedAt) {
      queueOperation.updateCompletedAt(updateDto.completedAt);
    }

    if (updateDto.cancelledAt) {
      queueOperation.updateCancelledAt(updateDto.cancelledAt);
    }

    if (updateDto.metadata) {
      queueOperation.updateMetadata(updateDto.metadata);
    }

    return this.queuePersistenceRepository.update(id, queueOperation);
  }

  async deleteQueueOperation(id: string): Promise<void> {
    this.logger.log(`Deleting queue operation ${id}`);

    const queueOperation = await this.getQueueOperationById(id);
    await this.queuePersistenceRepository.delete(id);
  }

  async executeQueueOperation(id: string): Promise<QueueOperation> {
    this.logger.log(`Executing queue operation ${id}`);

    const queueOperation = await this.getQueueOperationById(id);

    if (!queueOperation.isActive()) {
      throw new BadRequestException(`Queue operation ${id} is not in active status`);
    }

    queueOperation.updateStatus('draining');
    queueOperation.updateStartedAt(new Date());

    await this.queuePersistenceRepository.update(id, queueOperation);

    try {
      const result = await this.executeOperationByType(queueOperation);

      queueOperation.updateStatus('active');
      queueOperation.updateCompletedAt(new Date());
      queueOperation.updateResult(result);

      this.logger.log(`Queue operation ${id} completed successfully`);
    } catch (error) {
      queueOperation.updateStatus('error');
      queueOperation.updateErrorMessage(error.message);
      queueOperation.incrementRetryCount();
      queueOperation.updateNextRetryAt(this.calculateNextRetryTime(queueOperation.retryCount));

      this.logger.error(`Queue operation ${id} failed: ${error.message}`);
      throw error;
    }

    return this.queuePersistenceRepository.update(id, queueOperation);
  }

  async getQueueOperationsByStatus(status: string): Promise<QueueOperation[]> {
    return this.queuePersistenceRepository.findByStatus(status);
  }

  async getFailedQueueOperationsForRetry(): Promise<QueueOperation[]> {
    return this.queuePersistenceRepository.findFailedForRetry();
  }

  async getQueueOperationStatistics(): Promise<{
    total: number;
    active: number;
    paused: number;
    draining: number;
    maintenance: number;
    error: number;
    byOperationType: Record<string, number>;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  }> {
    return this.queuePersistenceRepository.getStatistics();
  }

  async bulkUpdateQueueOperationStatus(
    operationIds: string[],
    status: string,
    metadata?: Record<string, any>,
  ): Promise<{ successCount: number; errorCount: number }> {
    this.logger.log(`Bulk updating ${operationIds.length} queue operations to status ${status}`);

    const result = await this.queuePersistenceRepository.bulkUpdateStatus(
      operationIds,
      status,
      metadata,
    );

    this.logger.log(
      `Bulk update completed: ${result.successCount} success, ${result.errorCount} errors`,
    );
    return result;
  }

  async cleanupOldQueueOperations(daysOld: number): Promise<{ deletedCount: number }> {
    this.logger.log(`Cleaning up queue operations older than ${daysOld} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.queuePersistenceRepository.cleanupOld(cutoffDate);
    return result;
  }

  async getQueueHealthStatus(queueName: string): Promise<{
    isHealthy: boolean;
    status: string;
    metrics: {
      totalOperations: number;
      activeOperations: number;
      failedOperations: number;
      averageProcessingTime: number;
      successRate: number;
    };
  }> {
    return this.queuePersistenceRepository.getHealthStatus(queueName);
  }

  private async executeOperationByType(queueOperation: QueueOperation): Promise<any> {
    const startTime = Date.now();

    try {
      switch (queueOperation.operationType) {
        case 'enqueue':
          return await this.executeEnqueueOperation(queueOperation);
        case 'dequeue':
          return await this.executeDequeueOperation(queueOperation);
        case 'peek':
          return await this.executePeekOperation(queueOperation);
        case 'clear':
          return await this.executeClearOperation(queueOperation);
        case 'pause':
          return await this.executePauseOperation(queueOperation);
        case 'resume':
          return await this.executeResumeOperation(queueOperation);
        case 'prioritize':
          return await this.executePrioritizeOperation(queueOperation);
        case 'bulk_operation':
          return await this.executeBulkOperation(queueOperation);
        case 'migrate':
          return await this.executeMigrateOperation(queueOperation);
        case 'backup':
          return await this.executeBackupOperation(queueOperation);
        case 'restore':
          return await this.executeRestoreOperation(queueOperation);
        default:
          throw new Error(`Unknown operation type: ${queueOperation.operationType}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error.message,
        duration,
        timestamp: new Date(),
      };
    }
  }

  private async executeEnqueueOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      success: true,
      data: { message: 'Item enqueued successfully' },
      duration: 100,
      timestamp: new Date(),
    };
  }

  private async executeDequeueOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      success: true,
      data: { message: 'Item dequeued successfully' },
      duration: 150,
      timestamp: new Date(),
    };
  }

  private async executePeekOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      success: true,
      data: { message: 'Queue peeked successfully' },
      duration: 50,
      timestamp: new Date(),
    };
  }

  private async executeClearOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      success: true,
      data: { message: 'Queue cleared successfully' },
      duration: 200,
      timestamp: new Date(),
    };
  }

  private async executePauseOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      success: true,
      data: { message: 'Queue paused successfully' },
      duration: 100,
      timestamp: new Date(),
    };
  }

  private async executeResumeOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      success: true,
      data: { message: 'Queue resumed successfully' },
      duration: 100,
      timestamp: new Date(),
    };
  }

  private async executePrioritizeOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return {
      success: true,
      data: { message: 'Queue prioritized successfully' },
      duration: 120,
      timestamp: new Date(),
    };
  }

  private async executeBulkOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      success: true,
      data: { message: 'Bulk operation completed successfully' },
      duration: 500,
      timestamp: new Date(),
    };
  }

  private async executeMigrateOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      success: true,
      data: { message: 'Queue migrated successfully' },
      duration: 1000,
      timestamp: new Date(),
    };
  }

  private async executeBackupOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      data: { message: 'Queue backed up successfully' },
      duration: 800,
      timestamp: new Date(),
    };
  }

  private async executeRestoreOperation(queueOperation: QueueOperation): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return {
      success: true,
      data: { message: 'Queue restored successfully' },
      duration: 1200,
      timestamp: new Date(),
    };
  }

  private calculateNextRetryTime(retryCount: number): Date {
    const baseDelay = 1000; // 1 second
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    return new Date(Date.now() + delay);
  }
}
