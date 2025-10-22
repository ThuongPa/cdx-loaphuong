import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { UserSyncService } from '../../../src/modules/notification/user-sync/user-sync.service';
import { UserSyncRepository } from '../../../src/modules/notification/user-sync/user-sync.repository';
import {
  SyncStatus,
  SyncType,
  SyncSource,
} from '../../../src/modules/notification/user-sync/user-sync.schema';

describe('UserSyncService', () => {
  let service: UserSyncService;
  let mockRepository: jest.Mocked<UserSyncRepository>;
  let mockHttpService: any;

  beforeEach(async () => {
    const mockUserSyncRepository = {
      createUserSync: jest.fn(),
      getUserSyncById: jest.fn(),
      getUserSyncByUserId: jest.fn(),
      updateUserSync: jest.fn(),
      deleteUserSync: jest.fn(),
      findUserSyncs: jest.fn(),
      getUserSyncsByStatus: jest.fn(),
      createSyncBatch: jest.fn(),
      getSyncBatchByBatchId: jest.fn(),
      updateSyncBatch: jest.fn(),
      deleteSyncBatch: jest.fn(),
      getSyncBatchesByStatus: jest.fn(),
      getSyncBatchesByType: jest.fn(),
      getRecentSyncBatches: jest.fn(),
      createSyncLog: jest.fn(),
      getSyncLogsBySyncId: jest.fn(),
      getSyncLogsByLevel: jest.fn(),
      getSyncLogsByDateRange: jest.fn(),
      createSyncStatistics: jest.fn(),
      getSyncStatisticsByDate: jest.fn(),
      getSyncStatisticsByDateRange: jest.fn(),
      createSyncConfiguration: jest.fn(),
      getSyncConfigurationById: jest.fn(),
      getSyncConfigurationByName: jest.fn(),
      updateSyncConfiguration: jest.fn(),
      deleteSyncConfiguration: jest.fn(),
      getActiveSyncConfigurations: jest.fn(),
      getSyncStatistics: jest.fn(),
      bulkUpdateUserSyncStatus: jest.fn(),
      bulkCreateUserSyncs: jest.fn(),
      cleanupOldSyncs: jest.fn(),
      cleanupOldSyncLogs: jest.fn(),
      getFailedSyncsForRetry: jest.fn(),
      updateSyncRetryInfo: jest.fn(),
      updateBatchSummary: jest.fn(),
    };

    const mockHttpServiceObj = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      request: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSyncService,
        {
          provide: UserSyncRepository,
          useValue: mockUserSyncRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpServiceObj,
        },
      ],
    }).compile();

    service = module.get<UserSyncService>(UserSyncService);
    mockRepository = module.get(UserSyncRepository);
    mockHttpService = module.get(HttpService);

    // Initialize mock methods
    mockHttpService.post = jest.fn();
    mockHttpService.get = jest.fn();
    mockHttpService.put = jest.fn();
    mockHttpService.delete = jest.fn();
    mockHttpService.patch = jest.fn();

    // Set default mock implementations
    mockHttpService.post.mockReturnValue(of({ data: { id: 'test' } }));
    mockHttpService.get.mockReturnValue(of({ data: { id: 'test' } }));
    mockHttpService.put.mockReturnValue(of({ data: { id: 'test' } }));
    mockHttpService.delete.mockReturnValue(of({ data: { id: 'test' } }));
    mockHttpService.patch.mockReturnValue(of({ data: { id: 'test' } }));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUserSync', () => {
    it('should create a user sync successfully', async () => {
      const createDto = {
        userId: 'user123',
        syncType: 'FULL' as any,
        source: 'EXTERNAL_API',
        userData: { id: 'user123', email: 'test@example.com' },
        createdBy: 'system',
      };

      const expectedUserSync = {
        _id: 'sync123',
        ...createDto,
        status: SyncStatus.PENDING,
        retryCount: 0,
        maxRetries: 3,
        novuData: {
          subscriberId: 'user@example.com',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          preferences: createDto.userData,
        },
      };

      mockRepository.createUserSync.mockResolvedValue(expectedUserSync as any);

      const result = await service.createUserSync(createDto);

      expect(result).toEqual(expectedUserSync);
      expect(mockRepository.createUserSync).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          status: SyncStatus.PENDING,
          retryCount: 0,
          maxRetries: 3,
          novuData: expect.objectContaining({
            subscriberId: 'user@example.com',
            email: 'user@example.com',
          }),
        }),
      );
    });
  });

  describe('getUserSyncById', () => {
    it('should return user sync by id', async () => {
      const syncId = 'sync123';
      const expectedUserSync = {
        _id: syncId,
        userId: 'user123',
        syncType: SyncType.USER_UPDATE,
        status: SyncStatus.PENDING,
      };

      mockRepository.getUserSyncById.mockResolvedValue(expectedUserSync as any);

      const result = await service.getUserSyncById(syncId);

      expect(result).toEqual(expectedUserSync);
      expect(mockRepository.getUserSyncById).toHaveBeenCalledWith(syncId);
    });

    it('should return null if user sync not found', async () => {
      mockRepository.getUserSyncById.mockResolvedValue(null);

      const result = await service.getUserSyncById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('executeUserSync', () => {
    it('should execute user sync successfully', async () => {
      const syncId = 'sync123';
      const userSync = {
        _id: syncId,
        userId: 'user123',
        syncType: SyncType.USER_UPDATE,
        status: SyncStatus.PENDING,
        novuData: {
          subscriberId: 'user@example.com',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const mockResponse = {
        data: { id: 'subscriber123', status: 'created' as any },
      };

      mockRepository.getUserSyncById.mockResolvedValue(userSync as any);
      mockRepository.updateUserSync.mockResolvedValue({} as any);
      mockRepository.createUserSync.mockResolvedValue({} as any);
      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.deleteUserSync(syncId);

      expect(result).toBeDefined();
      expect(mockRepository.updateUserSync).toHaveBeenCalledWith(
        syncId,
        expect.objectContaining({
          status: SyncStatus.IN_PROGRESS,
          startedAt: expect.any(Date),
        }),
      );
      expect(mockRepository.updateUserSync).toHaveBeenCalledWith(
        syncId,
        expect.objectContaining({
          status: SyncStatus.COMPLETED,
          completedAt: expect.any(Date),
          syncResult: expect.objectContaining({
            success: true,
            processedFields: expect.any(Array),
          }),
        }),
      );
    });

    it('should handle sync execution failure', async () => {
      const syncId = 'sync123';
      const userSync = {
        _id: syncId,
        userId: 'user123',
        syncType: SyncType.USER_UPDATE,
        status: SyncStatus.PENDING,
        novuData: {
          subscriberId: 'user@example.com',
          email: 'user@example.com',
        },
        retryCount: 0,
        maxRetries: 3,
      };

      mockRepository.getUserSyncById.mockResolvedValue(userSync as any);
      mockRepository.updateUserSync.mockResolvedValue({} as any);
      mockRepository.createUserSync.mockResolvedValue({} as any);
      mockHttpService.post.mockImplementation(() => {
        throw new Error('API Error');
      });

      await expect(service.deleteUserSync(syncId)).rejects.toThrow('API Error');

      expect(mockRepository.updateUserSync).toHaveBeenCalledWith(
        syncId,
        expect.objectContaining({
          status: SyncStatus.FAILED,
          errorMessage: 'API Error',
          retryCount: 1,
          nextRetryAt: expect.any(Date),
        }),
      );
    });

    it('should throw error if user sync not found', async () => {
      mockRepository.getUserSyncById.mockResolvedValue(null);

      await expect(service.deleteUserSync('nonexistent')).rejects.toThrow(
        'User sync nonexistent not found',
      );
    });

    it('should throw error if user sync not in pending status', async () => {
      const userSync = {
        _id: 'sync123',
        status: SyncStatus.IN_PROGRESS,
      };

      mockRepository.getUserSyncById.mockResolvedValue(userSync as any);

      await expect(service.deleteUserSync('sync123')).rejects.toThrow(
        'User sync sync123 is not in pending status',
      );
    });
  });

  describe('createSyncBatch', () => {
    it('should create a sync batch successfully', async () => {
      const createDto = {
        userId: 'user123',
        syncType: 'FULL' as any,
        source: 'EXTERNAL_API',
        userData: { id: 'user123', email: 'test@example.com' },
        createdBy: 'system',
      };

      const expectedBatch = {
        _id: 'batch123',
        batchId: 'batch_123456789_abcdef',
        syncType: createDto.syncType,
        source: createDto.source,
        status: SyncStatus.PENDING,
        syncIds: ['sync1', 'sync2', 'sync3'],
        summary: {
          totalUsers: 3,
          pendingUsers: 3,
          inProgressUsers: 0,
          completedUsers: 0,
          failedUsers: 0,
          cancelledUsers: 0,
          successRate: 0,
          averageDuration: 0,
        },
      };

      mockRepository.createUserSync.mockResolvedValue({ _id: 'sync1' } as any);
      mockRepository.createUserSync.mockResolvedValue(expectedBatch as any);

      const result = await service.createUserSync(createDto);

      expect(result).toEqual(expectedBatch);
      expect(mockRepository.createUserSync).toHaveBeenCalledTimes(3);
      expect(mockRepository.createUserSync).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: expect.stringMatching(/^batch_\d+_[a-z0-9]+$/),
          syncType: createDto.syncType,
          source: createDto.source,
          status: SyncStatus.PENDING,
          syncIds: expect.arrayContaining(['sync1', 'sync2', 'sync3']),
          summary: expect.objectContaining({
            totalUsers: 3,
            pendingUsers: 3,
          }),
        }),
      );
    });
  });

  describe('executeSyncBatch', () => {
    it('should execute sync batch successfully', async () => {
      const batchId = 'batch123';
      const batch = {
        _id: 'batch123',
        batchId,
        syncType: SyncType.FULL_SYNC,
        source: SyncSource.MANUAL,
        status: SyncStatus.PENDING,
        syncIds: ['sync1', 'sync2'],
      };

      mockRepository.getUserSyncById.mockResolvedValue(batch as any);
      mockRepository.updateUserSync.mockResolvedValue({} as any);
      mockRepository.updateUserSync.mockResolvedValue({} as any);
      mockRepository.getUserSyncById.mockResolvedValue({
        _id: 'sync1',
        status: SyncStatus.PENDING,
      } as any);
      mockRepository.updateUserSync.mockResolvedValue({} as any);
      mockRepository.createUserSync.mockResolvedValue({} as any);
      mockHttpService.post.mockReturnValue(of({ data: { id: 'subscriber123' } }));

      const result = await service.deleteUserSync(batchId);

      expect(result).toBeDefined();
      expect(mockRepository.updateUserSync).toHaveBeenCalledWith(
        batch._id?.toString() || '',
        expect.objectContaining({
          status: SyncStatus.IN_PROGRESS,
          startedAt: expect.any(Date),
        }),
      );
      expect(mockRepository.updateUserSync).toHaveBeenCalledWith(batchId);
      expect(mockRepository.updateUserSync).toHaveBeenCalledWith(
        batch._id?.toString() || '',
        expect.objectContaining({
          status: SyncStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should throw error if batch not found', async () => {
      mockRepository.getUserSyncById.mockResolvedValue(null);

      await expect(service.deleteUserSync('nonexistent')).rejects.toThrow(
        'Sync batch nonexistent not found',
      );
    });

    it('should throw error if batch not in pending status', async () => {
      const batch = {
        _id: 'batch123',
        batchId: 'batch123',
        status: SyncStatus.IN_PROGRESS,
      };

      mockRepository.getUserSyncById.mockResolvedValue(batch as any);

      await expect(service.deleteUserSync('batch123')).rejects.toThrow(
        'Sync batch batch123 is not in pending status',
      );
    });
  });

  describe('getSyncStatistics', () => {
    it('should return sync statistics', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const mockStats = {
        total: 100,
        byStatus: {
          [SyncStatus.COMPLETED]: 80,
          [SyncStatus.FAILED]: 15,
          [SyncStatus.PENDING]: 5,
        },
        byType: {
          [SyncType.FULL_SYNC]: 20,
          [SyncType.INCREMENTAL_SYNC]: 30,
          [SyncType.USER_UPDATE]: 50,
        },
        bySource: {
          [SyncSource.API]: 60,
          [SyncSource.WEBHOOK]: 30,
          [SyncSource.MANUAL]: 10,
        },
        averageDuration: 1500,
        successRate: 0.8,
      };

      mockRepository.getUserSyncById.mockResolvedValue(mockStats as any);

      const result = await service.getUserSyncById('sync123');

      expect(result).toEqual({
        date: expect.any(Date),
        global: {
          totalSyncs: 100,
          successfulSyncs: 80,
          failedSyncs: 15,
          pendingSyncs: 5,
          averageDuration: 1500,
          successRate: 0.8,
        },
        byType: mockStats.byType,
        bySource: mockStats.bySource,
        performance: {
          averageResponseTime: 1500,
          peakConcurrency: 0,
          errorRate: 0.15,
          retryRate: 0,
          timeoutRate: 0,
        },
      });

      expect(mockRepository.getUserSyncById).toHaveBeenCalledWith(dateRange);
    });
  });

  describe('bulkUpdateUserSyncStatus', () => {
    it('should bulk update user sync status successfully', async () => {
      const syncIds = ['sync1', 'sync2', 'sync3'];
      const status = SyncStatus.COMPLETED;
      const metadata = { source: 'bulk_operation' };

      const expectedResult = {
        successCount: 3,
        errorCount: 0,
      };

      mockRepository.updateUserSync.mockResolvedValue(expectedResult);

      const result = await service.updateUserSync(syncIds[0], { status: 'COMPLETED' as any });

      expect(result).toEqual(expectedResult);
      expect(mockRepository.updateUserSync).toHaveBeenCalledWith(syncIds, status, metadata);
    });
  });

  describe('createSyncConfiguration', () => {
    it('should create a sync configuration successfully', async () => {
      const createDto = {
        userId: 'user123',
        syncType: 'FULL' as any,
        source: 'EXTERNAL_API',
        userData: { id: 'user123', email: 'test@example.com' },
        createdBy: 'system',
      };

      const expectedConfiguration = {
        _id: 'config123',
        ...createDto,
        isActive: true,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
      };

      mockRepository.createUserSync.mockResolvedValue(expectedConfiguration as any);

      const result = await service.createUserSync(createDto);

      expect(result).toEqual(expectedConfiguration);
      expect(mockRepository.createUserSync).toHaveBeenCalledWith(createDto);
    });
  });
});
