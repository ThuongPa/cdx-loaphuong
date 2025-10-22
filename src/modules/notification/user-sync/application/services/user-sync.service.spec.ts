import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserSyncService } from './user-sync.service';
import { UserSyncRepository } from '../../infrastructure/user-sync.repository';
import { UserSync } from '../../domain/user-sync.entity';

describe('UserSyncService', () => {
  let service: UserSyncService;
  let repository: jest.Mocked<UserSyncRepository>;

  const mockUserSync = {
    id: '1',
    userId: 'user1',
    type: 'user_update' as const,
    source: 'api' as const,
    status: 'pending' as const,
    data: { email: 'test@example.com' },
    reason: 'Test sync',
    priority: 1,
    isScheduled: false,
    scheduledAt: undefined,
    startedAt: undefined,
    completedAt: undefined,
    errorMessage: undefined,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      findByStatus: jest.fn(),
      findFailedForRetry: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      cleanupOldSyncs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSyncService,
        {
          provide: 'UserSyncRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserSyncService>(UserSyncService);
    repository = module.get('UserSyncRepository');
  });

  describe('createUserSync', () => {
    it('should create a user sync successfully', async () => {
      const createDto = {
        userId: 'user1',
        type: 'user_update' as const,
        source: 'api' as const,
        data: { email: 'test@example.com' },
        reason: 'Test sync',
        priority: 1,
        isScheduled: false,
        maxRetries: 3,
      };

      const userSync = UserSync.create({
        ...createDto,
        status: 'pending',
        retryCount: 0,
      });
      repository.create.mockResolvedValue(userSync);

      const result = await service.createUserSync(createDto);

      expect(result).toBeDefined();
      expect(result.userId).toBe(createDto.userId);
      expect(result.type).toBe(createDto.type);
      expect(result.source).toBe(createDto.source);
      expect(result.status).toBe('pending');
      expect(repository.create).toHaveBeenCalledWith(expect.any(UserSync));
    });

    it('should throw BadRequestException if userId is missing', async () => {
      const createDto = {
        userId: '',
        type: 'user_update' as const,
        source: 'api' as const,
      };

      await expect(service.createUserSync(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if type is missing', async () => {
      const createDto = {
        userId: 'user1',
        type: undefined as any,
        source: 'api' as const,
      };

      await expect(service.createUserSync(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if source is missing', async () => {
      const createDto = {
        userId: 'user1',
        type: 'user_update' as const,
        source: undefined as any,
      };

      await expect(service.createUserSync(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserSyncById', () => {
    it('should return user sync if found', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      repository.findById.mockResolvedValue(userSync);

      const result = await service.getUserSyncById('1');

      expect(result).toBe(userSync);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if user sync not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getUserSyncById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserSyncsByUserId', () => {
    it('should return user syncs for user', async () => {
      const userSyncs = [
        UserSync.create({
          userId: 'user1',
          type: 'user_update',
          source: 'api',
          status: 'pending',
          priority: 1,
          isScheduled: false,
          retryCount: 0,
          maxRetries: 3,
        }),
      ];
      repository.findByUserId.mockResolvedValue(userSyncs);

      const result = await service.getUserSyncsByUserId('user1');

      expect(result).toBe(userSyncs);
      expect(repository.findByUserId).toHaveBeenCalledWith('user1');
    });
  });

  describe('updateUserSync', () => {
    it('should update user sync successfully', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      repository.findById.mockResolvedValue(userSync);
      repository.update.mockResolvedValue(userSync);

      const updateDto = {
        status: 'in_progress' as const,
        errorMessage: 'Test error',
      };

      const result = await service.updateUserSync('1', updateDto);

      expect(result).toBe(userSync);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(UserSync));
    });

    it('should throw NotFoundException if user sync not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.updateUserSync('1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUserSync', () => {
    it('should delete user sync successfully', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      repository.findById.mockResolvedValue(userSync);
      repository.delete.mockResolvedValue();

      await service.deleteUserSync('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if user sync not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteUserSync('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('executeUserSync', () => {
    it('should execute user sync successfully', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      repository.findById.mockResolvedValue(userSync);
      repository.update.mockResolvedValue(userSync);

      const result = await service.executeUserSync('1');

      expect(result).toBe(userSync);
      expect(repository.update).toHaveBeenCalledTimes(2); // Once for in_progress, once for completed
    });

    it('should throw BadRequestException if user sync is not pending', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      userSync.updateStatus('completed');
      repository.findById.mockResolvedValue(userSync);

      await expect(service.executeUserSync('1')).rejects.toThrow(BadRequestException);
    });

    it('should handle sync failure', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      repository.findById.mockResolvedValue(userSync);
      repository.update.mockResolvedValue(userSync);

      // Mock sync failure
      jest.spyOn(service as any, 'performSync').mockRejectedValue(new Error('Sync failed'));

      await expect(service.executeUserSync('1')).rejects.toThrow('Sync failed');
      expect(repository.update).toHaveBeenCalledTimes(2); // Once for in_progress, once for failed
    });
  });

  describe('retryUserSync', () => {
    it('should retry failed user sync successfully', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      userSync.updateStatus('failed');
      repository.findById.mockResolvedValue(userSync);
      repository.update.mockResolvedValue(userSync);

      const result = await service.retryUserSync('1');

      expect(result).toBe(userSync);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(UserSync));
    });

    it('should throw BadRequestException if user sync is not failed', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      userSync.updateStatus('completed');
      repository.findById.mockResolvedValue(userSync);

      await expect(service.retryUserSync('1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if max retries exceeded', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      userSync.updateStatus('failed');
      userSync.incrementRetryCount();
      userSync.incrementRetryCount();
      userSync.incrementRetryCount();
      repository.findById.mockResolvedValue(userSync);

      await expect(service.retryUserSync('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserSyncsByStatus', () => {
    it('should return user syncs by status', async () => {
      const userSyncs = [
        UserSync.create({
          userId: 'user1',
          type: 'user_update',
          source: 'api',
          status: 'pending',
          priority: 1,
          isScheduled: false,
          retryCount: 0,
          maxRetries: 3,
        }),
      ];
      repository.findByStatus.mockResolvedValue(userSyncs);

      const result = await service.getUserSyncsByStatus('pending');

      expect(result).toBe(userSyncs);
      expect(repository.findByStatus).toHaveBeenCalledWith('pending');
    });
  });

  describe('getFailedSyncsForRetry', () => {
    it('should return failed syncs for retry', async () => {
      const userSyncs = [
        UserSync.create({
          userId: 'user1',
          type: 'user_update',
          source: 'api',
          status: 'pending',
          priority: 1,
          isScheduled: false,
          retryCount: 0,
          maxRetries: 3,
        }),
      ];
      repository.findFailedForRetry.mockResolvedValue(userSyncs);

      const result = await service.getFailedSyncsForRetry();

      expect(result).toBe(userSyncs);
      expect(repository.findFailedForRetry).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateUserSyncStatus', () => {
    it('should bulk update user sync status', async () => {
      const userSync = UserSync.create({
        userId: 'user1',
        type: 'user_update',
        source: 'api',
        status: 'pending',
        priority: 1,
        isScheduled: false,
        retryCount: 0,
        maxRetries: 3,
      });
      repository.findById.mockResolvedValue(userSync);
      repository.update.mockResolvedValue(userSync);

      const result = await service.bulkUpdateUserSyncStatus(['1'], 'completed');

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('getSyncStatistics', () => {
    it('should return sync statistics', async () => {
      const userSyncs = [
        UserSync.create({
          userId: 'user1',
          type: 'user_update',
          source: 'api',
          status: 'pending',
          priority: 1,
          isScheduled: false,
          retryCount: 0,
          maxRetries: 3,
        }),
        UserSync.create({
          userId: 'user2',
          type: 'user_update',
          source: 'api',
          status: 'pending',
          priority: 1,
          isScheduled: false,
          retryCount: 0,
          maxRetries: 3,
        }),
      ];
      repository.find.mockResolvedValue(userSyncs);

      const result = await service.getSyncStatistics();

      expect(result.total).toBe(2);
      expect(result.pending).toBe(2);
      expect(result.completed).toBe(0);
    });
  });

  describe('cleanupOldSyncs', () => {
    it('should cleanup old syncs', async () => {
      repository.cleanupOldSyncs.mockResolvedValue(5);

      const result = await service.cleanupOldSyncs(30);

      expect(result).toBe(5);
      expect(repository.cleanupOldSyncs).toHaveBeenCalledWith(expect.any(Date));
    });
  });
});
