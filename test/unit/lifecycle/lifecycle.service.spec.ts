import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleService } from '../../../src/modules/notification/lifecycle/lifecycle.service';
import { LifecycleRepository } from '../../../src/modules/notification/lifecycle/lifecycle.repository';
import {
  LifecycleStage,
  RetentionPolicy,
  ArchivalStatus,
} from '../../../src/modules/notification/lifecycle/lifecycle.schema';

describe('LifecycleService', () => {
  let service: LifecycleService;
  let mockRepository: jest.Mocked<LifecycleRepository>;

  beforeEach(async () => {
    const mockLifecycleRepository = {
      createLifecycle: jest.fn(),
      getLifecycleById: jest.fn(),
      getLifecycleByNotificationId: jest.fn(),
      updateLifecycle: jest.fn(),
      deleteLifecycle: jest.fn(),
      updateLifecycleStage: jest.fn(),
      getLifecyclesByStage: jest.fn(),
      getLifecyclesByUser: jest.fn(),
      findLifecycles: jest.fn(),
      getLifecycleStatistics: jest.fn(),
      createPolicy: jest.fn(),
      getPolicyById: jest.fn(),
      getPolicyByName: jest.fn(),
      updatePolicy: jest.fn(),
      deletePolicy: jest.fn(),
      getActivePolicies: jest.fn(),
      createRetentionRule: jest.fn(),
      getRetentionRuleById: jest.fn(),
      updateRetentionRule: jest.fn(),
      deleteRetentionRule: jest.fn(),
      getActiveRetentionRules: jest.fn(),
      createExecution: jest.fn(),
      updateExecution: jest.fn(),
      getExecutionById: jest.fn(),
      getExecutionsByPolicy: jest.fn(),
      getRecentExecutions: jest.fn(),
      createStatistics: jest.fn(),
      getStatisticsByDate: jest.fn(),
      getStatisticsByDateRange: jest.fn(),
      bulkUpdateLifecycleStage: jest.fn(),
      bulkArchiveLifecycles: jest.fn(),
      bulkDeleteLifecycles: jest.fn(),
      cleanupExpiredLifecycles: jest.fn(),
      cleanupOldExecutions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleService,
        {
          provide: LifecycleRepository,
          useValue: mockLifecycleRepository,
        },
      ],
    }).compile();

    service = module.get<LifecycleService>(LifecycleService);
    mockRepository = module.get(LifecycleRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLifecycle', () => {
    it('should create a lifecycle successfully', async () => {
      const createDto = {
        notificationId: 'notification123',
        userId: 'user123',
        currentStage: LifecycleStage.CREATED,
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
        },
        metadata: {
          source: 'system',
          priority: 'high',
          category: 'notification',
          channel: 'push',
        },
      };

      const expectedLifecycle = {
        _id: 'lifecycle123',
        ...createDto,
        stageHistory: [
          {
            stage: LifecycleStage.CREATED,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0,
          responseTime: 0,
          deliveryTime: 0,
        },
      };

      mockRepository.createLifecycle.mockResolvedValue(expectedLifecycle as any);

      const result = await service.createLifecycle(createDto);

      expect(result).toEqual(expectedLifecycle);
      expect(mockRepository.createLifecycle).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          stageHistory: expect.any(Array),
          archivalStatus: ArchivalStatus.ACTIVE,
          retention: expect.objectContaining({
            ...createDto.retention,
            expiresAt: expect.any(Date),
          }),
          analytics: expect.objectContaining({
            engagementScore: 0,
            responseTime: 0,
            deliveryTime: 0,
          }),
        }),
      );
    });
  });

  describe('getLifecycleById', () => {
    it('should return lifecycle by id', async () => {
      const lifecycleId = 'lifecycle123';
      const expectedLifecycle = {
        _id: lifecycleId,
        notificationId: 'notification123',
        userId: 'user123',
        currentStage: LifecycleStage.CREATED,
      };

      mockRepository.getLifecycleById.mockResolvedValue(expectedLifecycle as any);

      const result = await service.getLifecycleById(lifecycleId);

      expect(result).toEqual(expectedLifecycle);
      expect(mockRepository.getLifecycleById).toHaveBeenCalledWith(lifecycleId);
    });

    it('should return null if lifecycle not found', async () => {
      mockRepository.getLifecycleById.mockResolvedValue(null);

      const result = await service.getLifecycleById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateLifecycleStage', () => {
    it('should update lifecycle stage successfully', async () => {
      const lifecycleId = 'lifecycle123';
      const newStage = LifecycleStage.SENT;
      const metadata = { source: 'user_action' };
      const triggeredBy = 'user123';
      const reason = 'User action';

      const updatedLifecycle = {
        _id: lifecycleId,
        currentStage: newStage,
        stageHistory: [
          {
            stage: LifecycleStage.CREATED,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
          {
            stage: newStage,
            timestamp: new Date(),
            metadata,
            triggeredBy,
            reason,
          },
        ],
      };

      mockRepository.updateLifecycleStage.mockResolvedValue(updatedLifecycle as any);

      const result = await service.updateLifecycleStage(
        lifecycleId,
        newStage,
        metadata,
        triggeredBy,
        reason,
      );

      expect(result).toEqual(updatedLifecycle);
      expect(mockRepository.updateLifecycleStage).toHaveBeenCalledWith(
        lifecycleId,
        newStage,
        metadata,
        triggeredBy,
        reason,
      );
    });
  });

  describe('getLifecyclesByStage', () => {
    it('should return lifecycles by stage', async () => {
      const stage = LifecycleStage.SENT;
      const expectedLifecycles = [
        {
          _id: 'lifecycle1',
          currentStage: stage,
          notificationId: 'notification1',
        },
        {
          _id: 'lifecycle2',
          currentStage: stage,
          notificationId: 'notification2',
        },
      ];

      mockRepository.getLifecyclesByStage.mockResolvedValue(expectedLifecycles as any);

      const result = await service.getLifecyclesByStage(stage);

      expect(result).toEqual(expectedLifecycles);
      expect(mockRepository.getLifecyclesByStage).toHaveBeenCalledWith(stage);
    });
  });

  describe('createPolicy', () => {
    it('should create a lifecycle policy successfully', async () => {
      const createDto = {
        name: 'Test Policy',
        description: 'Test policy description',
        conditions: {
          stages: [LifecycleStage.SENT, LifecycleStage.DELIVERED],
          channels: ['push', 'email'],
          ageDays: { min: 7, max: 30 },
        },
        actions: {
          type: 'archive' as const,
          delayDays: 7,
          conditions: {
            minEngagementScore: 0.5,
            maxAgeDays: 30,
          },
        },
        schedule: {
          frequency: 'daily' as const,
          time: '02:00',
          timezone: 'UTC',
        },
        createdBy: 'admin123',
      };

      const expectedPolicy = {
        _id: 'policy123',
        ...createDto,
        isActive: true,
        executionCount: 0,
        processedCount: 0,
      };

      mockRepository.createPolicy.mockResolvedValue(expectedPolicy as any);

      const result = await service.createPolicy(createDto);

      expect(result).toEqual(expectedPolicy);
      expect(mockRepository.createPolicy).toHaveBeenCalledWith(createDto);
    });
  });

  describe('executePolicy', () => {
    it('should execute policy successfully', async () => {
      const policyId = 'policy123';
      const policy = {
        _id: policyId,
        name: 'Test Policy',
        conditions: {
          stages: [LifecycleStage.SENT],
          channels: ['push'],
        },
        actions: {
          type: 'archive' as const,
          delayDays: 7,
        },
        executionCount: 0,
        processedCount: 0,
      };

      const matchingLifecycles = [
        {
          _id: 'lifecycle1',
          notificationId: 'notification1',
          currentStage: LifecycleStage.SENT,
        },
        {
          _id: 'lifecycle2',
          notificationId: 'notification2',
          currentStage: LifecycleStage.SENT,
        },
      ];

      const expectedExecution = {
        _id: 'execution123',
        policyId,
        executionId: 'exec_123456789_abcdef',
        summary: {
          totalProcessed: 2,
          archivedCount: 2,
          deletedCount: 0,
          anonymizedCount: 0,
          exportedCount: 0,
          retainedCount: 0,
          errorCount: 0,
        },
        results: [
          {
            notificationId: 'notification1',
            action: 'archive',
            status: 'success',
            metadata: { archivedAt: expect.any(Date) },
          },
          {
            notificationId: 'notification2',
            action: 'archive',
            status: 'success',
            metadata: { archivedAt: expect.any(Date) },
          },
        ],
        startedAt: expect.any(Date),
        completedAt: expect.any(Date),
        duration: expect.any(Number),
      };

      mockRepository.getPolicyById.mockResolvedValue(policy as any);
      mockRepository.findLifecycles.mockResolvedValue(matchingLifecycles as any);
      mockRepository.updateLifecycle.mockResolvedValue({} as any);
      mockRepository.createExecution.mockResolvedValue(expectedExecution as any);
      mockRepository.updatePolicy.mockResolvedValue({} as any);

      const result = await service.executePolicy(policyId);

      expect(result).toEqual(expectedExecution);
      expect(mockRepository.getPolicyById).toHaveBeenCalledWith(policyId);
      expect(mockRepository.findLifecycles).toHaveBeenCalledWith(policy.conditions);
      expect(mockRepository.createExecution).toHaveBeenCalled();
      expect(mockRepository.updatePolicy).toHaveBeenCalledWith(
        policyId,
        expect.objectContaining({
          executionCount: 1,
          processedCount: 2,
          lastExecutedAt: expect.any(Date),
        }),
      );
    });

    it('should throw error if policy not found', async () => {
      mockRepository.getPolicyById.mockResolvedValue(null);

      await expect(service.executePolicy('nonexistent')).rejects.toThrow(
        'Policy nonexistent not found',
      );
    });
  });

  describe('getLifecycleStatistics', () => {
    it('should return lifecycle statistics', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const mockStats = {
        total: 100,
        byStage: {
          [LifecycleStage.CREATED]: 10,
          [LifecycleStage.SENT]: 30,
          [LifecycleStage.DELIVERED]: 40,
          [LifecycleStage.READ]: 20,
        },
        byRetention: {
          [RetentionPolicy.SHORT_TERM]: 50,
          [RetentionPolicy.MEDIUM_TERM]: 30,
          [RetentionPolicy.LONG_TERM]: 20,
        },
        byChannel: {
          push: 60,
          email: 30,
          sms: 10,
        },
        averageAge: 5.5,
        averageEngagementScore: 0.65,
      };

      mockRepository.getLifecycleStatistics.mockResolvedValue(mockStats as any);

      const result = await service.getLifecycleStatistics(dateRange);

      expect(result).toEqual({
        date: expect.any(Date),
        global: {
          totalNotifications: 100,
          activeNotifications: 70,
          archivedNotifications: 0,
          deletedNotifications: 0,
          averageAge: 5.5,
          averageEngagementScore: 0.65,
        },
        byStage: mockStats.byStage,
        byRetention: mockStats.byRetention,
        byChannel: mockStats.byChannel,
        compliance: {
          gdprCompliant: 0,
          dataRetentionCompliant: 0,
          auditTrailEntries: 0,
          anonymizedRecords: 0,
        },
      });

      expect(mockRepository.getLifecycleStatistics).toHaveBeenCalledWith(dateRange);
    });
  });

  describe('bulkUpdateLifecycleStage', () => {
    it('should bulk update lifecycle stages successfully', async () => {
      const lifecycleIds = ['lifecycle1', 'lifecycle2', 'lifecycle3'];
      const newStage = LifecycleStage.ARCHIVED;
      const metadata = { source: 'bulk_operation' };
      const triggeredBy = 'admin123';
      const reason = 'Bulk archival';

      const expectedResult = {
        successCount: 3,
        errorCount: 0,
      };

      mockRepository.bulkUpdateLifecycleStage.mockResolvedValue(expectedResult);

      const result = await service.bulkUpdateLifecycleStage(
        lifecycleIds,
        newStage,
        metadata,
        triggeredBy,
        reason,
      );

      expect(result).toEqual(expectedResult);
      expect(mockRepository.bulkUpdateLifecycleStage).toHaveBeenCalledWith(
        lifecycleIds,
        newStage,
        metadata,
        triggeredBy,
        reason,
      );
    });
  });

  describe('bulkArchiveLifecycles', () => {
    it('should bulk archive lifecycles successfully', async () => {
      const lifecycleIds = ['lifecycle1', 'lifecycle2'];
      const expectedResult = {
        successCount: 2,
        errorCount: 0,
      };

      mockRepository.bulkArchiveLifecycles.mockResolvedValue(expectedResult);

      const result = await service.bulkArchiveLifecycles(lifecycleIds);

      expect(result).toEqual(expectedResult);
      expect(mockRepository.bulkArchiveLifecycles).toHaveBeenCalledWith(lifecycleIds);
    });
  });

  describe('bulkDeleteLifecycles', () => {
    it('should bulk delete lifecycles successfully', async () => {
      const lifecycleIds = ['lifecycle1', 'lifecycle2'];
      const expectedResult = {
        successCount: 2,
        errorCount: 0,
      };

      mockRepository.bulkDeleteLifecycles.mockResolvedValue(expectedResult);

      const result = await service.bulkDeleteLifecycles(lifecycleIds);

      expect(result).toEqual(expectedResult);
      expect(mockRepository.bulkDeleteLifecycles).toHaveBeenCalledWith(lifecycleIds);
    });
  });
});
