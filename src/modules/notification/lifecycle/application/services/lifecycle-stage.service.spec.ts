import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleStageService } from './lifecycle-stage.service';
import { LifecycleStageRepository } from '../../infrastructure/lifecycle-stage.repository';
import { LifecycleStage } from '../../domain/lifecycle-stage.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LifecycleStageService', () => {
  let service: LifecycleStageService;
  let lifecycleStageRepository: jest.Mocked<LifecycleStageRepository>;

  beforeEach(async () => {
    const mockLifecycleStageRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findByOrder: jest.fn(),
      findMany: jest.fn(),
      findActive: jest.fn(),
      findByOrderSequence: jest.fn(),
      findByType: jest.fn(),
      findByUser: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleStageService,
        {
          provide: 'LifecycleStageRepository',
          useValue: mockLifecycleStageRepository,
        },
      ],
    }).compile();

    service = module.get<LifecycleStageService>(LifecycleStageService);
    lifecycleStageRepository = module.get('LifecycleStageRepository');
  });

  describe('createLifecycleStage', () => {
    it('should create a lifecycle stage successfully', async () => {
      const createDto = {
        name: 'Test Stage',
        description: 'Test description',
        type: 'onboarding' as const,
        order: 1,
        triggers: [
          {
            type: 'user_signup' as const,
            config: { event: 'user.created' },
          },
        ],
        actions: [
          {
            type: 'send_notification' as const,
            config: { template: 'welcome' },
          },
        ],
        conditions: [],
      };

      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        description: 'Test description',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: createDto.triggers,
        actions: createDto.actions,
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findByOrder.mockResolvedValue(null);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.createLifecycleStage(createDto, 'user123');

      expect(result).toEqual(mockStage);
      expect(lifecycleStageRepository.findByOrder).toHaveBeenCalledWith(1);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no triggers provided', async () => {
      const createDto = {
        name: 'Test Stage',
        type: 'onboarding' as const,
        order: 1,
        triggers: [],
        actions: [
          {
            type: 'send_notification' as const,
            config: { template: 'welcome' },
          },
        ],
        conditions: [],
      };

      await expect(service.createLifecycleStage(createDto, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no actions provided', async () => {
      const createDto = {
        name: 'Test Stage',
        type: 'onboarding' as const,
        order: 1,
        triggers: [
          {
            type: 'user_signup' as const,
            config: { event: 'user.created' },
          },
        ],
        actions: [],
        conditions: [],
      };

      await expect(service.createLifecycleStage(createDto, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if order already exists', async () => {
      const createDto = {
        name: 'Test Stage',
        type: 'onboarding' as const,
        order: 1,
        triggers: [
          {
            type: 'user_signup' as const,
            config: { event: 'user.created' },
          },
        ],
        actions: [
          {
            type: 'send_notification' as const,
            config: { template: 'welcome' },
          },
        ],
        conditions: [],
      };

      const existingStage = LifecycleStage.create({
        name: 'Existing Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findByOrder.mockResolvedValue(existingStage);

      await expect(service.createLifecycleStage(createDto, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLifecycleStageById', () => {
    it('should return stage if found', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);

      const result = await service.getLifecycleStageById('stage123');

      expect(result).toEqual(mockStage);
      expect(lifecycleStageRepository.findById).toHaveBeenCalledWith('stage123');
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.getLifecycleStageById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLifecycleStage', () => {
    it('should update stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const updates = {
        name: 'Updated Stage',
        description: 'Updated description',
      };

      const updatedStage = LifecycleStage.create({
        name: 'Updated Stage',
        description: 'Updated description',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.save.mockResolvedValue(updatedStage);

      const result = await service.updateLifecycleStage('stage123', updates);

      expect(result).toEqual(updatedStage);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.updateLifecycleStage('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if order already exists', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const existingStage = LifecycleStage.create({
        name: 'Existing Stage',
        type: 'onboarding',
        isActive: true,
        order: 2,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.findByOrder.mockResolvedValue(existingStage);

      await expect(service.updateLifecycleStage('stage123', { order: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteLifecycleStage', () => {
    it('should delete stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.delete.mockResolvedValue(undefined);

      await service.deleteLifecycleStage('stage123');

      expect(lifecycleStageRepository.findById).toHaveBeenCalledWith('stage123');
      expect(lifecycleStageRepository.delete).toHaveBeenCalledWith('stage123');
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.deleteLifecycleStage('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateLifecycleStage', () => {
    it('should activate stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: false,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.activateLifecycleStage('stage123');

      expect(result.isActive).toBe(true);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.activateLifecycleStage('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivateLifecycleStage', () => {
    it('should deactivate stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.deactivateLifecycleStage('stage123');

      expect(result.isActive).toBe(false);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateLifecycleStage('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getActiveLifecycleStages', () => {
    it('should return active stages', async () => {
      const mockStages = [
        LifecycleStage.create({
          name: 'Stage 1',
          type: 'onboarding',
          isActive: true,
          order: 1,
          triggers: [],
          actions: [],
          conditions: [],
          createdBy: 'user123',
        }),
        LifecycleStage.create({
          name: 'Stage 2',
          type: 'engagement',
          isActive: true,
          order: 2,
          triggers: [],
          actions: [],
          conditions: [],
          createdBy: 'user123',
        }),
      ];

      lifecycleStageRepository.findActive.mockResolvedValue(mockStages);

      const result = await service.getActiveLifecycleStages();

      expect(result).toEqual(mockStages);
      expect(lifecycleStageRepository.findActive).toHaveBeenCalled();
    });
  });

  describe('getLifecycleStagesByOrder', () => {
    it('should return stages ordered by sequence', async () => {
      const mockStages = [
        LifecycleStage.create({
          name: 'Stage 1',
          type: 'onboarding',
          isActive: true,
          order: 1,
          triggers: [],
          actions: [],
          conditions: [],
          createdBy: 'user123',
        }),
        LifecycleStage.create({
          name: 'Stage 2',
          type: 'engagement',
          isActive: true,
          order: 2,
          triggers: [],
          actions: [],
          conditions: [],
          createdBy: 'user123',
        }),
      ];

      lifecycleStageRepository.findByOrderSequence.mockResolvedValue(mockStages);

      const result = await service.getLifecycleStagesByOrder();

      expect(result).toEqual(mockStages);
      expect(lifecycleStageRepository.findByOrderSequence).toHaveBeenCalled();
    });
  });

  describe('addTrigger', () => {
    it('should add trigger to stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const newTrigger = {
        type: 'user_signup' as const,
        config: { event: 'user.created' },
      };

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.addTrigger('stage123', newTrigger);

      expect(result).toEqual(mockStage);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.addTrigger('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeTrigger', () => {
    it('should remove trigger from stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [
          {
            type: 'user_signup' as const,
            config: { event: 'user.created' },
          },
        ],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.removeTrigger('stage123', 0);

      expect(result).toEqual(mockStage);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.removeTrigger('nonexistent', 0)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addAction', () => {
    it('should add action to stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const newAction = {
        type: 'send_notification' as const,
        config: { template: 'welcome' },
      };

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.addAction('stage123', newAction);

      expect(result).toEqual(mockStage);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.addAction('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAction', () => {
    it('should remove action from stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [
          {
            type: 'send_notification' as const,
            config: { template: 'welcome' },
          },
        ],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.removeAction('stage123', 0);

      expect(result).toEqual(mockStage);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.removeAction('nonexistent', 0)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addCondition', () => {
    it('should add condition to stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const newCondition = {
        field: 'user.status',
        operator: 'equals' as const,
        value: 'active',
      };

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.addCondition('stage123', newCondition);

      expect(result).toEqual(mockStage);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.addCondition('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCondition', () => {
    it('should remove condition from stage successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [
          {
            field: 'user.status',
            operator: 'equals' as const,
            value: 'active',
          },
        ],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.removeCondition('stage123', 0);

      expect(result).toEqual(mockStage);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.removeCondition('nonexistent', 0)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrder', () => {
    it('should update order successfully', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.findByOrder.mockResolvedValue(null);
      lifecycleStageRepository.save.mockResolvedValue(mockStage);

      const result = await service.updateOrder('stage123', 2);

      expect(result).toEqual(mockStage);
      expect(lifecycleStageRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.updateOrder('nonexistent', 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order already exists', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const existingStage = LifecycleStage.create({
        name: 'Existing Stage',
        type: 'onboarding',
        isActive: true,
        order: 2,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);
      lifecycleStageRepository.findByOrder.mockResolvedValue(existingStage);

      await expect(service.updateOrder('stage123', 2)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLifecycleStagesByUser', () => {
    it('should return stages created by user', async () => {
      const mockStages = [
        LifecycleStage.create({
          name: 'User Stage 1',
          type: 'onboarding',
          isActive: true,
          order: 1,
          triggers: [],
          actions: [],
          conditions: [],
          createdBy: 'user123',
        }),
        LifecycleStage.create({
          name: 'User Stage 2',
          type: 'engagement',
          isActive: true,
          order: 2,
          triggers: [],
          actions: [],
          conditions: [],
          createdBy: 'user123',
        }),
      ];

      lifecycleStageRepository.findByUser.mockResolvedValue(mockStages);

      const result = await service.getLifecycleStagesByUser('user123');

      expect(result).toEqual(mockStages);
      expect(lifecycleStageRepository.findByUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('searchLifecycleStages', () => {
    it('should return matching stages', async () => {
      const mockStages = [
        LifecycleStage.create({
          name: 'Test Stage 1',
          type: 'onboarding',
          isActive: true,
          order: 1,
          triggers: [],
          actions: [],
          conditions: [],
          createdBy: 'user123',
        }),
        LifecycleStage.create({
          name: 'Test Stage 2',
          type: 'engagement',
          isActive: true,
          order: 2,
          triggers: [],
          actions: [],
          conditions: [],
          createdBy: 'user123',
        }),
      ];

      lifecycleStageRepository.search.mockResolvedValue(mockStages);

      const result = await service.searchLifecycleStages('test');

      expect(result).toEqual(mockStages);
      expect(lifecycleStageRepository.search).toHaveBeenCalledWith('test');
    });
  });

  describe('bulkUpdateLifecycleStages', () => {
    it('should update multiple stages successfully', async () => {
      const mockStage1 = LifecycleStage.create({
        name: 'Stage 1',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const mockStage2 = LifecycleStage.create({
        name: 'Stage 2',
        type: 'engagement',
        isActive: true,
        order: 2,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const updatedStage1 = LifecycleStage.create({
        name: 'Updated Stage 1',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const updatedStage2 = LifecycleStage.create({
        name: 'Updated Stage 2',
        type: 'engagement',
        isActive: true,
        order: 2,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById
        .mockResolvedValueOnce(mockStage1)
        .mockResolvedValueOnce(mockStage2);

      lifecycleStageRepository.save
        .mockResolvedValueOnce(updatedStage1)
        .mockResolvedValueOnce(updatedStage2);

      const updates = [
        { id: 'stage1', updates: { name: 'Updated Stage 1' } },
        { id: 'stage2', updates: { name: 'Updated Stage 2' } },
      ];

      const result = await service.bulkUpdateLifecycleStages(updates);

      expect(result).toEqual([updatedStage1, updatedStage2]);
      expect(lifecycleStageRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('bulkDeleteLifecycleStages', () => {
    it('should delete multiple stages successfully', async () => {
      const mockStage1 = LifecycleStage.create({
        name: 'Stage 1',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      const mockStage2 = LifecycleStage.create({
        name: 'Stage 2',
        type: 'engagement',
        isActive: true,
        order: 2,
        triggers: [],
        actions: [],
        conditions: [],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById
        .mockResolvedValueOnce(mockStage1)
        .mockResolvedValueOnce(mockStage2);

      lifecycleStageRepository.delete.mockResolvedValue(undefined);

      await service.bulkDeleteLifecycleStages(['stage1', 'stage2']);

      expect(lifecycleStageRepository.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('getLifecycleStageStatistics', () => {
    it('should return stage statistics', async () => {
      const mockStage = LifecycleStage.create({
        name: 'Test Stage',
        type: 'onboarding',
        isActive: true,
        order: 1,
        triggers: [
          {
            type: 'user_signup' as const,
            config: { event: 'user.created' },
          },
        ],
        actions: [
          {
            type: 'send_notification' as const,
            config: { template: 'welcome' },
          },
        ],
        conditions: [
          {
            field: 'user.status',
            operator: 'equals' as const,
            value: 'active',
          },
        ],
        createdBy: 'user123',
      });

      lifecycleStageRepository.findById.mockResolvedValue(mockStage);

      const result = await service.getLifecycleStageStatistics('stage123');

      expect(result).toHaveProperty('stage');
      expect(result).toHaveProperty('statistics');
      expect(result.statistics.totalTriggers).toBe(1);
      expect(result.statistics.totalActions).toBe(1);
      expect(result.statistics.totalConditions).toBe(1);
    });

    it('should throw NotFoundException if stage not found', async () => {
      lifecycleStageRepository.findById.mockResolvedValue(null);

      await expect(service.getLifecycleStageStatistics('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
