import { Test, TestingModule } from '@nestjs/testing';
import { QueuePersistenceService } from '../../../src/modules/notification/queue-persistence/queue-persistence.service';
import { QueuePersistenceRepository } from '../../../src/modules/notification/queue-persistence/queue-persistence.repository';
import {
  QueueOperationType,
  QueueStatus,
  PersistenceStrategy,
} from '../../../src/modules/notification/queue-persistence/queue-persistence.schema';

describe('QueuePersistenceService', () => {
  let service: QueuePersistenceService;
  let mockRepository: jest.Mocked<QueuePersistenceRepository>;

  beforeEach(async () => {
    const mockQueuePersistenceRepository = {
      createQueueOperation: jest.fn(),
      getQueueOperationById: jest.fn(),
      getQueueOperationByOperationId: jest.fn(),
      updateQueueOperation: jest.fn(),
      deleteQueueOperation: jest.fn(),
      findQueueOperations: jest.fn(),
      getQueueOperationsByQueueName: jest.fn(),
      getQueueOperationsByType: jest.fn(),
      getQueueOperationsByStatus: jest.fn(),
      createQueueSnapshot: jest.fn(),
      getQueueSnapshotById: jest.fn(),
      getQueueSnapshotBySnapshotId: jest.fn(),
      updateQueueSnapshot: jest.fn(),
      deleteQueueSnapshot: jest.fn(),
      getQueueSnapshotsByQueueName: jest.fn(),
      getQueueSnapshotsByStrategy: jest.fn(),
      getRecentQueueSnapshots: jest.fn(),
      createQueueMigration: jest.fn(),
      getQueueMigrationById: jest.fn(),
      getQueueMigrationByMigrationId: jest.fn(),
      updateQueueMigration: jest.fn(),
      deleteQueueMigration: jest.fn(),
      getQueueMigrationsByQueueName: jest.fn(),
      getQueueMigrationsByStatus: jest.fn(),
      getActiveQueueMigrations: jest.fn(),
      createQueueBackup: jest.fn(),
      getQueueBackupById: jest.fn(),
      getQueueBackupByBackupId: jest.fn(),
      updateQueueBackup: jest.fn(),
      deleteQueueBackup: jest.fn(),
      getQueueBackupsByQueueName: jest.fn(),
      getQueueBackupsByStatus: jest.fn(),
      getQueueBackupsByStorageType: jest.fn(),
      getExpiredQueueBackups: jest.fn(),
      createQueueRestore: jest.fn(),
      getQueueRestoreById: jest.fn(),
      getQueueRestoreByRestoreId: jest.fn(),
      updateQueueRestore: jest.fn(),
      deleteQueueRestore: jest.fn(),
      getQueueRestoresByQueueName: jest.fn(),
      getQueueRestoresByStatus: jest.fn(),
      getQueueRestoresByBackupId: jest.fn(),
      createQueueStatistics: jest.fn(),
      getQueueStatisticsByDate: jest.fn(),
      getQueueStatisticsByDateRange: jest.fn(),
      getQueueStatisticsByQueueName: jest.fn(),
      getQueueStatistics: jest.fn(),
      bulkUpdateQueueOperationStatus: jest.fn(),
      bulkCreateQueueOperations: jest.fn(),
      cleanupOldQueueOperations: jest.fn(),
      cleanupOldQueueSnapshots: jest.fn(),
      cleanupExpiredQueueBackups: jest.fn(),
      getFailedQueueOperationsForRetry: jest.fn(),
      updateQueueOperationRetryInfo: jest.fn(),
      getQueueHealthStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuePersistenceService,
        {
          provide: QueuePersistenceRepository,
          useValue: mockQueuePersistenceRepository,
        },
      ],
    }).compile();

    service = module.get<QueuePersistenceService>(QueuePersistenceService);
    mockRepository = module.get(QueuePersistenceRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createQueueOperation', () => {
    it('should create a queue operation successfully', async () => {
      const createDto = {
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        payload: {
          data: { message: 'test message' },
          priority: 1,
          delay: 0,
          ttl: 3600,
        },
        createdBy: 'admin123',
      };

      const expectedOperation = {
        _id: 'operation123',
        operationId: 'op_123456789_abcdef',
        ...createDto,
        status: QueueStatus.ACTIVE,
        retryCount: 0,
        maxRetries: 3,
      };

      mockRepository.createQueueOperation.mockResolvedValue(expectedOperation as any);

      const result = await service.createQueueOperation(createDto);

      expect(result).toEqual(expectedOperation);
      expect(mockRepository.createQueueOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          status: QueueStatus.ACTIVE,
          retryCount: 0,
          maxRetries: 3,
        }),
      );
    });
  });

  describe('getQueueOperationById', () => {
    it('should return queue operation by id', async () => {
      const operationId = 'operation123';
      const expectedOperation = {
        _id: operationId,
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
      };

      mockRepository.getQueueOperationById.mockResolvedValue(expectedOperation as any);

      const result = await service.getQueueOperationById(operationId);

      expect(result).toEqual(expectedOperation);
      expect(mockRepository.getQueueOperationById).toHaveBeenCalledWith(operationId);
    });

    it('should return null if queue operation not found', async () => {
      mockRepository.getQueueOperationById.mockResolvedValue(null);

      const result = await service.getQueueOperationById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('executeQueueOperation', () => {
    it('should execute queue operation successfully', async () => {
      const operationId = 'operation123';
      const operation = {
        _id: operationId,
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: {
          data: { message: 'test message' },
          priority: 1,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      mockRepository.getQueueOperationById.mockResolvedValue(operation as any);
      mockRepository.updateQueueOperation.mockResolvedValue({} as any);

      const result = await service.executeQueueOperation(operationId);

      expect(result).toBeDefined();
      expect(mockRepository.updateQueueOperation).toHaveBeenCalledWith(
        operationId,
        expect.objectContaining({
          status: QueueStatus.DRAINING,
          startedAt: expect.any(Date),
        }),
      );
      expect(mockRepository.updateQueueOperation).toHaveBeenCalledWith(
        operationId,
        expect.objectContaining({
          status: QueueStatus.ACTIVE,
          completedAt: expect.any(Date),
          result: expect.objectContaining({
            success: true,
            data: expect.any(Object),
            duration: expect.any(Number),
          }),
        }),
      );
    });

    it('should handle operation execution failure', async () => {
      const operationId = 'operation123';
      const operation = {
        _id: operationId,
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: {
          data: { message: 'test message' },
        },
        retryCount: 0,
        maxRetries: 3,
      };

      mockRepository.getQueueOperationById.mockResolvedValue(operation as any);
      mockRepository.updateQueueOperation.mockResolvedValue({} as any);

      // Mock the executeOperationByType to throw an error
      jest
        .spyOn(service as any, 'executeOperationByType')
        .mockRejectedValue(new Error('Operation failed'));

      await expect(service.executeQueueOperation(operationId)).rejects.toThrow('Operation failed');

      expect(mockRepository.updateQueueOperation).toHaveBeenCalledWith(
        operationId,
        expect.objectContaining({
          status: QueueStatus.ERROR,
          errorMessage: 'Operation failed',
          retryCount: 1,
          nextRetryAt: expect.any(Date),
        }),
      );
    });

    it('should throw error if queue operation not found', async () => {
      mockRepository.getQueueOperationById.mockResolvedValue(null);

      await expect(service.executeQueueOperation('nonexistent')).rejects.toThrow(
        'Queue operation nonexistent not found',
      );
    });

    it('should throw error if queue operation not in active status', async () => {
      const operation = {
        _id: 'operation123',
        status: QueueStatus.ERROR,
      };

      mockRepository.getQueueOperationById.mockResolvedValue(operation as any);

      await expect(service.executeQueueOperation('operation123')).rejects.toThrow(
        'Queue operation operation123 is not in active status',
      );
    });
  });

  describe('createQueueSnapshot', () => {
    it('should create a queue snapshot successfully', async () => {
      const createDto = {
        queueName: 'test-queue',
        persistenceStrategy: PersistenceStrategy.REDIS_PERSISTENT,
        version: '1.0.0',
        description: 'Test snapshot',
        tags: ['test', 'snapshot'],
        createdBy: 'admin123',
      };

      const expectedSnapshot = {
        _id: 'snapshot123',
        snapshotId: 'snapshot_123456789_abcdef',
        ...createDto,
        snapshot: {
          totalItems: 100,
          pendingItems: 50,
          processingItems: 20,
          completedItems: 25,
          failedItems: 5,
          pausedItems: 0,
          items: [],
          configuration: {
            maxSize: 1000,
            concurrency: 5,
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 30000,
          },
          statistics: {
            averageProcessingTime: 150,
            successRate: 0.95,
            errorRate: 0.05,
            throughput: 100,
          },
        },
      };

      mockRepository.createQueueSnapshot.mockResolvedValue(expectedSnapshot as any);

      const result = await service.createQueueSnapshot(createDto);

      expect(result).toEqual(expectedSnapshot);
      expect(mockRepository.createQueueSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          snapshotId: expect.stringMatching(/^snapshot_\d+_[a-z0-9]+$/),
          snapshot: expect.objectContaining({
            totalItems: expect.any(Number),
            pendingItems: expect.any(Number),
            processingItems: expect.any(Number),
            completedItems: expect.any(Number),
            failedItems: expect.any(Number),
            pausedItems: expect.any(Number),
            items: expect.any(Array),
            configuration: expect.any(Object),
            statistics: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('createQueueMigration', () => {
    it('should create a queue migration successfully', async () => {
      const createDto = {
        queueName: 'test-queue',
        source: {
          type: 'redis' as const,
          connection: { host: 'localhost', port: 6379 },
          configuration: { db: 0 },
        },
        target: {
          type: 'redis' as const,
          connection: { host: 'localhost', port: 6380 },
          configuration: { db: 1 },
        },
        mapping: {
          fieldMappings: { old_field: 'new_field' },
          transformations: { transform: 'function' },
          filters: { status: 'active' },
        },
        createdBy: 'admin123',
      };

      const expectedMigration = {
        _id: 'migration123',
        migrationId: 'migration_123456789_abcdef',
        ...createDto,
        status: QueueStatus.ACTIVE,
        progress: {
          totalItems: 0,
          processedItems: 0,
          failedItems: 0,
          skippedItems: 0,
          percentage: 0,
        },
      };

      mockRepository.createQueueMigration.mockResolvedValue(expectedMigration as any);

      const result = await service.createQueueMigration(createDto);

      expect(result).toEqual(expectedMigration);
      expect(mockRepository.createQueueMigration).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          migrationId: expect.stringMatching(/^migration_\d+_[a-z0-9]+$/),
          status: QueueStatus.ACTIVE,
          progress: expect.objectContaining({
            totalItems: 0,
            processedItems: 0,
            failedItems: 0,
            skippedItems: 0,
            percentage: 0,
          }),
        }),
      );
    });
  });

  describe('executeQueueMigration', () => {
    it('should execute queue migration successfully', async () => {
      const migrationId = 'migration123';
      const migration = {
        _id: 'migration123',
        migrationId,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        source: {
          type: 'redis',
          connection: { host: 'localhost', port: 6379 },
          configuration: { db: 0 },
        },
        target: {
          type: 'redis',
          connection: { host: 'localhost', port: 6380 },
          configuration: { db: 1 },
        },
        mapping: {
          fieldMappings: { old_field: 'new_field' },
          transformations: { transform: 'function' },
          filters: { status: 'active' },
        },
      };

      mockRepository.getQueueMigrationByMigrationId.mockResolvedValue(migration as any);
      mockRepository.updateQueueMigration.mockResolvedValue({} as any);

      const result = await service.executeQueueMigration(migrationId);

      expect(result).toBeDefined();
      expect(mockRepository.updateQueueMigration).toHaveBeenCalledWith(
        migration._id?.toString() || '',
        expect.objectContaining({
          status: QueueStatus.DRAINING,
          startedAt: expect.any(Date),
        }),
      );
      expect(mockRepository.updateQueueMigration).toHaveBeenCalledWith(
        migration._id?.toString() || '',
        expect.objectContaining({
          status: QueueStatus.ACTIVE,
          completedAt: expect.any(Date),
          result: expect.objectContaining({
            success: true,
            migratedItems: 100,
            failedItems: 0,
            duration: 5000,
            errors: [],
          }),
        }),
      );
    });

    it('should throw error if migration not found', async () => {
      mockRepository.getQueueMigrationByMigrationId.mockResolvedValue(null);

      await expect(service.executeQueueMigration('nonexistent')).rejects.toThrow(
        'Queue migration nonexistent not found',
      );
    });

    it('should throw error if migration not in active status', async () => {
      const migration = {
        _id: 'migration123',
        migrationId: 'migration123',
        status: QueueStatus.ERROR,
      };

      mockRepository.getQueueMigrationByMigrationId.mockResolvedValue(migration as any);

      await expect(service.executeQueueMigration('migration123')).rejects.toThrow(
        'Queue migration migration123 is not in active status',
      );
    });
  });

  describe('createQueueBackup', () => {
    it('should create a queue backup successfully', async () => {
      const createDto = {
        queueName: 'test-queue',
        storage: {
          type: 's3' as const,
          location: 's3://bucket/backups/',
          compression: true,
          encryption: true,
        },
        description: 'Test backup',
        tags: ['test', 'backup'],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: 'admin123',
      };

      const expectedBackup = {
        _id: 'backup123',
        backupId: 'backup_123456789_abcdef',
        ...createDto,
        status: QueueStatus.ACTIVE,
        backup: {
          totalItems: 100,
          items: [],
          configuration: {},
          statistics: {},
        },
      };

      mockRepository.createQueueBackup.mockResolvedValue(expectedBackup as any);

      const result = await service.createQueueBackup(createDto);

      expect(result).toEqual(expectedBackup);
      expect(mockRepository.createQueueBackup).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          backupId: expect.stringMatching(/^backup_\d+_[a-z0-9]+$/),
          status: QueueStatus.ACTIVE,
          backup: expect.objectContaining({
            totalItems: expect.any(Number),
            items: expect.any(Array),
            configuration: expect.any(Object),
            statistics: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('createQueueRestore', () => {
    it('should create a queue restore successfully', async () => {
      const createDto = {
        queueName: 'test-queue',
        backupId: 'backup123',
        target: {
          queueName: 'restored-queue',
          configuration: { maxSize: 1000 },
          overwrite: true,
          merge: false,
        },
        createdBy: 'admin123',
      };

      const expectedRestore = {
        _id: 'restore123',
        restoreId: 'restore_123456789_abcdef',
        ...createDto,
        status: QueueStatus.ACTIVE,
        progress: {
          totalItems: 0,
          restoredItems: 0,
          failedItems: 0,
          skippedItems: 0,
          percentage: 0,
        },
      };

      mockRepository.createQueueRestore.mockResolvedValue(expectedRestore as any);

      const result = await service.createQueueRestore(createDto);

      expect(result).toEqual(expectedRestore);
      expect(mockRepository.createQueueRestore).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          restoreId: expect.stringMatching(/^restore_\d+_[a-z0-9]+$/),
          status: QueueStatus.ACTIVE,
          progress: expect.objectContaining({
            totalItems: 0,
            restoredItems: 0,
            failedItems: 0,
            skippedItems: 0,
            percentage: 0,
          }),
        }),
      );
    });
  });

  describe('getQueueStatistics', () => {
    it('should return queue statistics', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const mockStats = {
        total: 100,
        byOperationType: {
          [QueueOperationType.ENQUEUE]: 50,
          [QueueOperationType.DEQUEUE]: 30,
          [QueueOperationType.PEEK]: 20,
        },
        byStatus: {
          [QueueStatus.ACTIVE]: 80,
          [QueueStatus.ERROR]: 15,
          [QueueStatus.DRAINING]: 5,
        },
        byQueueName: {
          'test-queue': 60,
          'other-queue': 40,
        },
        averageDuration: 150,
        successRate: 0.85,
      };

      mockRepository.getQueueStatistics.mockResolvedValue(mockStats as any);

      const result = await service.getQueueStatistics(dateRange, 'test-queue');

      expect(result).toEqual({
        date: expect.any(Date),
        queueName: 'test-queue',
        global: {
          totalOperations: 100,
          successfulOperations: 80,
          failedOperations: 15,
          pendingOperations: 80,
          averageProcessingTime: 150,
          successRate: 0.85,
          errorRate: 0.15,
          throughput: expect.any(Number),
        },
        byOperationType: mockStats.byOperationType,
        persistence: {
          redisOperations: 50,
          memoryOperations: 30,
          databaseOperations: 0,
          cacheHitRate: 0.95,
          cacheMissRate: 0.05,
          averageResponseTime: 150,
        },
      });

      expect(mockRepository.getQueueStatistics).toHaveBeenCalledWith(dateRange, 'test-queue');
    });
  });

  describe('bulkUpdateQueueOperationStatus', () => {
    it('should bulk update queue operation status successfully', async () => {
      const operationIds = ['op1', 'op2', 'op3'];
      const status = QueueStatus.ACTIVE;
      const metadata = { source: 'bulk_operation' };

      const expectedResult = {
        successCount: 3,
        errorCount: 0,
      };

      mockRepository.bulkUpdateQueueOperationStatus.mockResolvedValue(expectedResult);

      const result = await service.bulkUpdateQueueOperationStatus(operationIds, status, metadata);

      expect(result).toEqual(expectedResult);
      expect(mockRepository.bulkUpdateQueueOperationStatus).toHaveBeenCalledWith(
        operationIds,
        status,
        metadata,
      );
    });
  });

  describe('getQueueHealthStatus', () => {
    it('should return queue health status', async () => {
      const queueName = 'test-queue';
      const expectedHealth = {
        isHealthy: true,
        status: QueueStatus.ACTIVE,
        metrics: {
          totalOperations: 100,
          successfulOperations: 95,
          failedOperations: 5,
          averageProcessingTime: 150,
          successRate: 0.95,
          errorRate: 0.05,
        },
        issues: [],
      };

      mockRepository.getQueueHealthStatus.mockResolvedValue(expectedHealth);

      const result = await service.getQueueHealthStatus(queueName);

      expect(result).toEqual(expectedHealth);
      expect(mockRepository.getQueueHealthStatus).toHaveBeenCalledWith(queueName);
    });
  });
});
