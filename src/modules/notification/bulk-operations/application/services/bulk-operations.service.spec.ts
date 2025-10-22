import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BulkOperationsService } from './bulk-operations.service';
import { BulkOperationsRepository } from '../../infrastructure/bulk-operations.repository';
import { BulkOperation } from '../../domain/bulk-operation.entity';

describe('BulkOperationsService', () => {
  let service: BulkOperationsService;
  let repository: jest.Mocked<BulkOperationsRepository>;

  const mockBulkOperation = {
    id: '1',
    operationId: 'bulk_1234567890_abcdef123',
    operationType: 'bulk_send' as const,
    name: 'Test Bulk Operation',
    description: 'Test description',
    status: 'pending' as const,
    progress: {
      total: 100,
      processed: 0,
      failed: 0,
      skipped: 0,
      percentage: 0,
    },
    filters: { status: 'active' },
    options: {
      batchSize: 100,
      concurrency: 5,
      retryAttempts: 3,
      timeout: 30000,
      dryRun: false,
    },
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOperationId: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUser: jest.fn(),
      getStatistics: jest.fn(),
      cleanupOld: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkOperationsService,
        {
          provide: 'BulkOperationsRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BulkOperationsService>(BulkOperationsService);
    repository = module.get('BulkOperationsRepository');
  });

  describe('createBulkOperation', () => {
    it('should create a bulk operation successfully', async () => {
      const createDto = {
        operationType: 'bulk_send' as const,
        name: 'Test Bulk Operation',
        description: 'Test description',
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      };

      const bulkOperation = BulkOperation.create({
        operationId: 'bulk_1234567890_abcdef123',
        operationType: 'bulk_send',
        name: 'Test Bulk Operation',
        description: 'Test description',
        status: 'pending',
        progress: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      });
      repository.create.mockResolvedValue(bulkOperation);

      const result = await service.createBulkOperation(createDto);

      expect(result).toBeDefined();
      expect(result.operationType).toBe(createDto.operationType);
      expect(result.name).toBe(createDto.name);
      expect(result.status).toBe('pending');
      expect(repository.create).toHaveBeenCalledWith(expect.any(BulkOperation));
    });
  });

  describe('getBulkOperationById', () => {
    it('should return bulk operation if found', async () => {
      const bulkOperation = BulkOperation.create({
        operationId: 'bulk_1234567890_abcdef123',
        operationType: 'bulk_send',
        name: 'Test Bulk Operation',
        status: 'pending',
        progress: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(bulkOperation);

      const result = await service.getBulkOperationById('1');

      expect(result).toBe(bulkOperation);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if bulk operation not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getBulkOperationById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBulkOperationByOperationId', () => {
    it('should return bulk operation if found', async () => {
      const bulkOperation = BulkOperation.create({
        operationId: 'bulk_1234567890_abcdef123',
        operationType: 'bulk_send',
        name: 'Test Bulk Operation',
        status: 'pending',
        progress: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      });
      repository.findByOperationId.mockResolvedValue(bulkOperation);

      const result = await service.getBulkOperationByOperationId('bulk_1234567890_abcdef123');

      expect(result).toBe(bulkOperation);
      expect(repository.findByOperationId).toHaveBeenCalledWith('bulk_1234567890_abcdef123');
    });

    it('should throw NotFoundException if bulk operation not found', async () => {
      repository.findByOperationId.mockResolvedValue(null);

      await expect(
        service.getBulkOperationByOperationId('bulk_1234567890_abcdef123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBulkOperations', () => {
    it('should return bulk operations with filters', async () => {
      const bulkOperations = [
        BulkOperation.create({
          operationId: 'bulk_1234567890_abcdef123',
          operationType: 'bulk_send',
          name: 'Test Bulk Operation',
          status: 'pending',
          progress: {
            total: 0,
            processed: 0,
            failed: 0,
            skipped: 0,
            percentage: 0,
          },
          filters: { status: 'active' },
          options: {
            batchSize: 100,
            concurrency: 5,
            retryAttempts: 3,
            timeout: 30000,
            dryRun: false,
          },
          createdBy: 'user1',
        }),
      ];
      repository.find.mockResolvedValue({
        bulkOperations,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const filters = { statuses: ['pending'] };
      const result = await service.getBulkOperations(filters);

      expect(result.bulkOperations).toBe(bulkOperations);
      expect(result.total).toBe(1);
      expect(repository.find).toHaveBeenCalledWith(filters);
    });
  });

  describe('updateBulkOperation', () => {
    it('should update bulk operation successfully', async () => {
      const bulkOperation = BulkOperation.create({
        operationId: 'bulk_1234567890_abcdef123',
        operationType: 'bulk_send',
        name: 'Test Bulk Operation',
        status: 'pending',
        progress: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(bulkOperation);
      repository.update.mockResolvedValue(bulkOperation);

      const updateDto = {
        name: 'Updated Bulk Operation',
        updatedBy: 'user1',
      };

      const result = await service.updateBulkOperation('1', updateDto);

      expect(result).toBe(bulkOperation);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(BulkOperation));
    });
  });

  describe('deleteBulkOperation', () => {
    it('should delete bulk operation successfully', async () => {
      const bulkOperation = BulkOperation.create({
        operationId: 'bulk_1234567890_abcdef123',
        operationType: 'bulk_send',
        name: 'Test Bulk Operation',
        status: 'pending',
        progress: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(bulkOperation);
      repository.delete.mockResolvedValue();

      await service.deleteBulkOperation('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('startBulkOperation', () => {
    it('should start bulk operation successfully', async () => {
      const bulkOperation = BulkOperation.create({
        operationId: 'bulk_1234567890_abcdef123',
        operationType: 'bulk_send',
        name: 'Test Bulk Operation',
        status: 'pending',
        progress: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(bulkOperation);
      repository.update.mockResolvedValue(bulkOperation);

      const result = await service.startBulkOperation('1');

      expect(result).toBe(bulkOperation);
      expect(repository.update).toHaveBeenCalledTimes(2); // Once for processing, once for completion
    });

    it('should throw BadRequestException if bulk operation cannot be started', async () => {
      const bulkOperation = BulkOperation.create({
        operationId: 'bulk_1234567890_abcdef123',
        operationType: 'bulk_send',
        name: 'Test Bulk Operation',
        status: 'processing',
        progress: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(bulkOperation);

      await expect(service.startBulkOperation('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelBulkOperation', () => {
    it('should cancel bulk operation successfully', async () => {
      const bulkOperation = BulkOperation.create({
        operationId: 'bulk_1234567890_abcdef123',
        operationType: 'bulk_send',
        name: 'Test Bulk Operation',
        status: 'pending',
        progress: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(bulkOperation);
      repository.update.mockResolvedValue(bulkOperation);

      const result = await service.cancelBulkOperation('1', 'user1');

      expect(result).toBe(bulkOperation);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(BulkOperation));
    });

    it('should throw BadRequestException if bulk operation cannot be cancelled', async () => {
      const bulkOperation = BulkOperation.create({
        operationId: 'bulk_1234567890_abcdef123',
        operationType: 'bulk_send',
        name: 'Test Bulk Operation',
        status: 'completed',
        progress: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        filters: { status: 'active' },
        options: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          timeout: 30000,
          dryRun: false,
        },
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(bulkOperation);

      await expect(service.cancelBulkOperation('1', 'user1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBulkOperationsByUser', () => {
    it('should return bulk operations by user', async () => {
      const bulkOperations = [
        BulkOperation.create({
          operationId: 'bulk_1234567890_abcdef123',
          operationType: 'bulk_send',
          name: 'Test Bulk Operation',
          status: 'pending',
          progress: {
            total: 0,
            processed: 0,
            failed: 0,
            skipped: 0,
            percentage: 0,
          },
          filters: { status: 'active' },
          options: {
            batchSize: 100,
            concurrency: 5,
            retryAttempts: 3,
            timeout: 30000,
            dryRun: false,
          },
          createdBy: 'user1',
        }),
      ];
      repository.findByUser.mockResolvedValue(bulkOperations);

      const result = await service.getBulkOperationsByUser('user1');

      expect(result).toBe(bulkOperations);
      expect(repository.findByUser).toHaveBeenCalledWith('user1');
    });
  });

  describe('getBulkOperationStatistics', () => {
    it('should return bulk operation statistics', async () => {
      const stats = {
        total: 10,
        pending: 5,
        processing: 2,
        completed: 2,
        failed: 1,
        cancelled: 0,
        byOperationType: { bulk_send: 5, bulk_update: 3, bulk_delete: 2 },
        averageProcessingTime: 1500,
        successRate: 0.8,
        errorRate: 0.2,
      };
      repository.getStatistics.mockResolvedValue(stats);

      const result = await service.getBulkOperationStatistics();

      expect(result).toBe(stats);
      expect(repository.getStatistics).toHaveBeenCalled();
    });
  });

  describe('cleanupOldBulkOperations', () => {
    it('should cleanup old bulk operations', async () => {
      repository.cleanupOld.mockResolvedValue({ deletedCount: 5 });

      const result = await service.cleanupOldBulkOperations(30);

      expect(result.deletedCount).toBe(5);
      expect(repository.cleanupOld).toHaveBeenCalledWith(expect.any(Date));
    });
  });
});
