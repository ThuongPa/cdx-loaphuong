import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueuePersistenceService } from './queue-persistence.service';
import { QueuePersistenceRepository } from '../../infrastructure/queue-persistence.repository';
import { QueueOperation } from '../../domain/queue-operation.entity';

describe('QueuePersistenceService', () => {
  let service: QueuePersistenceService;
  let repository: jest.Mocked<QueuePersistenceRepository>;

  const mockQueueOperation = {
    id: '1',
    operationId: 'op_1234567890_abcdef123',
    operationType: 'enqueue' as const,
    queueName: 'test-queue',
    payload: {
      data: { message: 'test' },
      metadata: { priority: 1 },
      priority: 1,
      delay: 0,
      ttl: 3600,
      retryCount: 0,
      maxRetries: 3,
    },
    status: 'active' as const,
    retryCount: 0,
    maxRetries: 3,
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
      findByStatus: jest.fn(),
      findFailedForRetry: jest.fn(),
      getStatistics: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      cleanupOld: jest.fn(),
      getHealthStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuePersistenceService,
        {
          provide: 'QueuePersistenceRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<QueuePersistenceService>(QueuePersistenceService);
    repository = module.get('QueuePersistenceRepository');
  });

  describe('createQueueOperation', () => {
    it('should create a queue operation successfully', async () => {
      const createDto = {
        operationType: 'enqueue' as const,
        queueName: 'test-queue',
        payload: {
          data: { message: 'test' },
          metadata: { priority: 1 },
          priority: 1,
          delay: 0,
          ttl: 3600,
          retryCount: 0,
          maxRetries: 3,
        },
        createdBy: 'user1',
      };

      const queueOperation = QueueOperation.create({
        operationId: 'op_1234567890_abcdef123',
        operationType: 'enqueue',
        queueName: 'test-queue',
        payload: createDto.payload,
        status: 'active',
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'user1',
      });
      repository.create.mockResolvedValue(queueOperation);

      const result = await service.createQueueOperation(createDto);

      expect(result).toBeDefined();
      expect(result.operationType).toBe(createDto.operationType);
      expect(result.queueName).toBe(createDto.queueName);
      expect(result.status).toBe('active');
      expect(repository.create).toHaveBeenCalledWith(expect.any(QueueOperation));
    });
  });

  describe('getQueueOperationById', () => {
    it('should return queue operation if found', async () => {
      const queueOperation = QueueOperation.create({
        operationId: 'op_1234567890_abcdef123',
        operationType: 'enqueue',
        queueName: 'test-queue',
        payload: { data: { message: 'test' } },
        status: 'active',
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(queueOperation);

      const result = await service.getQueueOperationById('1');

      expect(result).toBe(queueOperation);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if queue operation not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getQueueOperationById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getQueueOperationByOperationId', () => {
    it('should return queue operation if found', async () => {
      const queueOperation = QueueOperation.create({
        operationId: 'op_1234567890_abcdef123',
        operationType: 'enqueue',
        queueName: 'test-queue',
        payload: { data: { message: 'test' } },
        status: 'active',
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'user1',
      });
      repository.findByOperationId.mockResolvedValue(queueOperation);

      const result = await service.getQueueOperationByOperationId('op_1234567890_abcdef123');

      expect(result).toBe(queueOperation);
      expect(repository.findByOperationId).toHaveBeenCalledWith('op_1234567890_abcdef123');
    });

    it('should throw NotFoundException if queue operation not found', async () => {
      repository.findByOperationId.mockResolvedValue(null);

      await expect(
        service.getQueueOperationByOperationId('op_1234567890_abcdef123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getQueueOperations', () => {
    it('should return queue operations with filters', async () => {
      const queueOperations = [
        QueueOperation.create({
          operationId: 'op_1234567890_abcdef123',
          operationType: 'enqueue',
          queueName: 'test-queue',
          payload: { data: { message: 'test' } },
          status: 'active',
          retryCount: 0,
          maxRetries: 3,
          createdBy: 'user1',
        }),
      ];
      repository.find.mockResolvedValue({
        queueOperations,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const filters = { statuses: ['active'] };
      const result = await service.getQueueOperations(filters);

      expect(result.queueOperations).toBe(queueOperations);
      expect(result.total).toBe(1);
      expect(repository.find).toHaveBeenCalledWith(filters);
    });
  });

  describe('updateQueueOperation', () => {
    it('should update queue operation successfully', async () => {
      const queueOperation = QueueOperation.create({
        operationId: 'op_1234567890_abcdef123',
        operationType: 'enqueue',
        queueName: 'test-queue',
        payload: { data: { message: 'test' } },
        status: 'active',
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(queueOperation);
      repository.update.mockResolvedValue(queueOperation);

      const updateDto = {
        status: 'paused' as const,
        updatedBy: 'user1',
      };

      const result = await service.updateQueueOperation('1', updateDto);

      expect(result).toBe(queueOperation);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(QueueOperation));
    });
  });

  describe('deleteQueueOperation', () => {
    it('should delete queue operation successfully', async () => {
      const queueOperation = QueueOperation.create({
        operationId: 'op_1234567890_abcdef123',
        operationType: 'enqueue',
        queueName: 'test-queue',
        payload: { data: { message: 'test' } },
        status: 'active',
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(queueOperation);
      repository.delete.mockResolvedValue();

      await service.deleteQueueOperation('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('executeQueueOperation', () => {
    it('should execute queue operation successfully', async () => {
      const queueOperation = QueueOperation.create({
        operationId: 'op_1234567890_abcdef123',
        operationType: 'enqueue',
        queueName: 'test-queue',
        payload: { data: { message: 'test' } },
        status: 'active',
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(queueOperation);
      repository.update.mockResolvedValue(queueOperation);

      const result = await service.executeQueueOperation('1');

      expect(result).toBe(queueOperation);
      expect(repository.update).toHaveBeenCalledTimes(2); // Once for processing, once for completion
    });

    it('should throw BadRequestException if queue operation is not active', async () => {
      const queueOperation = QueueOperation.create({
        operationId: 'op_1234567890_abcdef123',
        operationType: 'enqueue',
        queueName: 'test-queue',
        payload: { data: { message: 'test' } },
        status: 'paused',
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(queueOperation);

      await expect(service.executeQueueOperation('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getQueueOperationsByStatus', () => {
    it('should return queue operations by status', async () => {
      const queueOperations = [
        QueueOperation.create({
          operationId: 'op_1234567890_abcdef123',
          operationType: 'enqueue',
          queueName: 'test-queue',
          payload: { data: { message: 'test' } },
          status: 'active',
          retryCount: 0,
          maxRetries: 3,
          createdBy: 'user1',
        }),
      ];
      repository.findByStatus.mockResolvedValue(queueOperations);

      const result = await service.getQueueOperationsByStatus('active');

      expect(result).toBe(queueOperations);
      expect(repository.findByStatus).toHaveBeenCalledWith('active');
    });
  });

  describe('getFailedQueueOperationsForRetry', () => {
    it('should return failed queue operations for retry', async () => {
      const queueOperations = [
        QueueOperation.create({
          operationId: 'op_1234567890_abcdef123',
          operationType: 'enqueue',
          queueName: 'test-queue',
          payload: { data: { message: 'test' } },
          status: 'error',
          retryCount: 1,
          maxRetries: 3,
          createdBy: 'user1',
        }),
      ];
      repository.findFailedForRetry.mockResolvedValue(queueOperations);

      const result = await service.getFailedQueueOperationsForRetry();

      expect(result).toBe(queueOperations);
      expect(repository.findFailedForRetry).toHaveBeenCalled();
    });
  });

  describe('getQueueOperationStatistics', () => {
    it('should return queue operation statistics', async () => {
      const stats = {
        total: 10,
        active: 5,
        paused: 2,
        draining: 1,
        maintenance: 1,
        error: 1,
        byOperationType: { enqueue: 5, dequeue: 3, peek: 2 },
        averageProcessingTime: 150,
        successRate: 0.9,
        errorRate: 0.1,
      };
      repository.getStatistics.mockResolvedValue(stats);

      const result = await service.getQueueOperationStatistics();

      expect(result).toBe(stats);
      expect(repository.getStatistics).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateQueueOperationStatus', () => {
    it('should bulk update queue operation status', async () => {
      const operationIds = ['1', '2', '3'];
      const status = 'paused';
      const metadata = { reason: 'maintenance' };

      repository.bulkUpdateStatus.mockResolvedValue({ successCount: 3, errorCount: 0 });

      const result = await service.bulkUpdateQueueOperationStatus(operationIds, status, metadata);

      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
      expect(repository.bulkUpdateStatus).toHaveBeenCalledWith(operationIds, status, metadata);
    });
  });

  describe('cleanupOldQueueOperations', () => {
    it('should cleanup old queue operations', async () => {
      repository.cleanupOld.mockResolvedValue({ deletedCount: 5 });

      const result = await service.cleanupOldQueueOperations(30);

      expect(result.deletedCount).toBe(5);
      expect(repository.cleanupOld).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe('getQueueHealthStatus', () => {
    it('should return queue health status', async () => {
      const healthStatus = {
        isHealthy: true,
        status: 'healthy',
        metrics: {
          totalOperations: 100,
          activeOperations: 10,
          failedOperations: 5,
          averageProcessingTime: 150,
          successRate: 0.95,
        },
      };
      repository.getHealthStatus.mockResolvedValue(healthStatus);

      const result = await service.getQueueHealthStatus('test-queue');

      expect(result).toBe(healthStatus);
      expect(repository.getHealthStatus).toHaveBeenCalledWith('test-queue');
    });
  });
});
