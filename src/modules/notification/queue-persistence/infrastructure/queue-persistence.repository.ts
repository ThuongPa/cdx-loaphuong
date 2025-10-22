import { QueueOperation } from '../domain/queue-operation.entity';
import { QueueOperationFilters } from '../application/services/queue-persistence.service';

export interface QueuePersistenceRepository {
  create(queueOperation: QueueOperation): Promise<QueueOperation>;
  findById(id: string): Promise<QueueOperation | null>;
  findByOperationId(operationId: string): Promise<QueueOperation | null>;
  find(filters: QueueOperationFilters): Promise<{
    queueOperations: QueueOperation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  update(id: string, queueOperation: QueueOperation): Promise<QueueOperation>;
  delete(id: string): Promise<void>;
  findByStatus(status: string): Promise<QueueOperation[]>;
  findFailedForRetry(): Promise<QueueOperation[]>;
  getStatistics(): Promise<{
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
  }>;
  bulkUpdateStatus(
    operationIds: string[],
    status: string,
    metadata?: Record<string, any>,
  ): Promise<{ successCount: number; errorCount: number }>;
  cleanupOld(cutoffDate: Date): Promise<{ deletedCount: number }>;
  getHealthStatus(queueName: string): Promise<{
    isHealthy: boolean;
    status: string;
    metrics: {
      totalOperations: number;
      activeOperations: number;
      failedOperations: number;
      averageProcessingTime: number;
      successRate: number;
    };
  }>;
}
