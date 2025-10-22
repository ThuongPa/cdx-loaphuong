import { BulkOperation } from '../domain/bulk-operation.entity';
import { BulkOperationFilters } from '../application/services/bulk-operations.service';

export interface BulkOperationsRepository {
  create(bulkOperation: BulkOperation): Promise<BulkOperation>;
  findById(id: string): Promise<BulkOperation | null>;
  findByOperationId(operationId: string): Promise<BulkOperation | null>;
  find(filters: BulkOperationFilters): Promise<{
    bulkOperations: BulkOperation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  update(id: string, bulkOperation: BulkOperation): Promise<BulkOperation>;
  delete(id: string): Promise<void>;
  findByUser(createdBy: string): Promise<BulkOperation[]>;
  getStatistics(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    byOperationType: Record<string, number>;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  }>;
  cleanupOld(cutoffDate: Date): Promise<{ deletedCount: number }>;
}
