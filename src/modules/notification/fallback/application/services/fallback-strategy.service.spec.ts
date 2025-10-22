import { Test, TestingModule } from '@nestjs/testing';
import { FallbackStrategyService } from './fallback-strategy.service';
import { FallbackStrategyRepository } from '../../infrastructure/fallback-strategy.repository';
import { FallbackStrategy } from '../../domain/fallback-strategy.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FallbackStrategyService', () => {
  let service: FallbackStrategyService;
  let fallbackStrategyRepository: jest.Mocked<FallbackStrategyRepository>;

  beforeEach(async () => {
    const mockFallbackStrategyRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findByPriority: jest.fn(),
      findMany: jest.fn(),
      findActive: jest.fn(),
      findByPriorityOrder: jest.fn(),
      findByUser: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FallbackStrategyService,
        {
          provide: 'FallbackStrategyRepository',
          useValue: mockFallbackStrategyRepository,
        },
      ],
    }).compile();

    service = module.get<FallbackStrategyService>(FallbackStrategyService);
    fallbackStrategyRepository = module.get('FallbackStrategyRepository');
  });

  describe('createFallbackStrategy', () => {
    it('should create a fallback strategy successfully', async () => {
      const createDto = {
        name: 'Test Strategy',
        description: 'Test description',
        priority: 1,
        conditions: [
          {
            type: 'channel_failure' as const,
            operator: 'equals' as const,
            value: 'email',
          },
        ],
        actions: [
          {
            type: 'alternative_channel' as const,
            config: { channel: 'sms' },
          },
        ],
      };

      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        description: 'Test description',
        isActive: true,
        priority: 1,
        conditions: createDto.conditions,
        actions: createDto.actions,
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findByPriority.mockResolvedValue(null);
      fallbackStrategyRepository.save.mockResolvedValue(mockStrategy);

      const result = await service.createFallbackStrategy(createDto, 'user123');

      expect(result).toEqual(mockStrategy);
      expect(fallbackStrategyRepository.findByPriority).toHaveBeenCalledWith(1);
      expect(fallbackStrategyRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no conditions provided', async () => {
      const createDto = {
        name: 'Test Strategy',
        priority: 1,
        conditions: [],
        actions: [
          {
            type: 'alternative_channel' as const,
            config: { channel: 'sms' },
          },
        ],
      };

      await expect(service.createFallbackStrategy(createDto, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no actions provided', async () => {
      const createDto = {
        name: 'Test Strategy',
        priority: 1,
        conditions: [
          {
            type: 'channel_failure' as const,
            operator: 'equals' as const,
            value: 'email',
          },
        ],
        actions: [],
      };

      await expect(service.createFallbackStrategy(createDto, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if priority already exists', async () => {
      const createDto = {
        name: 'Test Strategy',
        priority: 1,
        conditions: [
          {
            type: 'channel_failure' as const,
            operator: 'equals' as const,
            value: 'email',
          },
        ],
        actions: [
          {
            type: 'alternative_channel' as const,
            config: { channel: 'sms' },
          },
        ],
      };

      const existingStrategy = FallbackStrategy.create({
        name: 'Existing Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findByPriority.mockResolvedValue(existingStrategy);

      await expect(service.createFallbackStrategy(createDto, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFallbackStrategyById', () => {
    it('should return strategy if found', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);

      const result = await service.getFallbackStrategyById('strategy123');

      expect(result).toEqual(mockStrategy);
      expect(fallbackStrategyRepository.findById).toHaveBeenCalledWith('strategy123');
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.getFallbackStrategyById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateFallbackStrategy', () => {
    it('should update strategy successfully', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      const updates = {
        name: 'Updated Strategy',
        description: 'Updated description',
      };

      const updatedStrategy = FallbackStrategy.create({
        name: 'Updated Strategy',
        description: 'Updated description',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.save.mockResolvedValue(updatedStrategy);

      const result = await service.updateFallbackStrategy('strategy123', updates);

      expect(result).toEqual(updatedStrategy);
      expect(fallbackStrategyRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.updateFallbackStrategy('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if priority already exists', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      const existingStrategy = FallbackStrategy.create({
        name: 'Existing Strategy',
        isActive: true,
        priority: 2,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.findByPriority.mockResolvedValue(existingStrategy);

      await expect(service.updateFallbackStrategy('strategy123', { priority: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteFallbackStrategy', () => {
    it('should delete strategy successfully', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.delete.mockResolvedValue(undefined);

      await service.deleteFallbackStrategy('strategy123');

      expect(fallbackStrategyRepository.findById).toHaveBeenCalledWith('strategy123');
      expect(fallbackStrategyRepository.delete).toHaveBeenCalledWith('strategy123');
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.deleteFallbackStrategy('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activateFallbackStrategy', () => {
    it('should activate strategy successfully', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: false,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.save.mockResolvedValue(mockStrategy);

      const result = await service.activateFallbackStrategy('strategy123');

      expect(result.isActive).toBe(true);
      expect(fallbackStrategyRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.activateFallbackStrategy('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivateFallbackStrategy', () => {
    it('should deactivate strategy successfully', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.save.mockResolvedValue(mockStrategy);

      const result = await service.deactivateFallbackStrategy('strategy123');

      expect(result.isActive).toBe(false);
      expect(fallbackStrategyRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateFallbackStrategy('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getActiveFallbackStrategies', () => {
    it('should return active strategies', async () => {
      const mockStrategies = [
        FallbackStrategy.create({
          name: 'Strategy 1',
          isActive: true,
          priority: 1,
          conditions: [],
          actions: [],
          createdBy: 'user123',
        }),
        FallbackStrategy.create({
          name: 'Strategy 2',
          isActive: true,
          priority: 2,
          conditions: [],
          actions: [],
          createdBy: 'user123',
        }),
      ];

      fallbackStrategyRepository.findActive.mockResolvedValue(mockStrategies);

      const result = await service.getActiveFallbackStrategies();

      expect(result).toEqual(mockStrategies);
      expect(fallbackStrategyRepository.findActive).toHaveBeenCalled();
    });
  });

  describe('getFallbackStrategiesByPriority', () => {
    it('should return strategies ordered by priority', async () => {
      const mockStrategies = [
        FallbackStrategy.create({
          name: 'Strategy 1',
          isActive: true,
          priority: 1,
          conditions: [],
          actions: [],
          createdBy: 'user123',
        }),
        FallbackStrategy.create({
          name: 'Strategy 2',
          isActive: true,
          priority: 2,
          conditions: [],
          actions: [],
          createdBy: 'user123',
        }),
      ];

      fallbackStrategyRepository.findByPriorityOrder.mockResolvedValue(mockStrategies);

      const result = await service.getFallbackStrategiesByPriority();

      expect(result).toEqual(mockStrategies);
      expect(fallbackStrategyRepository.findByPriorityOrder).toHaveBeenCalled();
    });
  });

  describe('addCondition', () => {
    it('should add condition to strategy successfully', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      const newCondition = {
        type: 'channel_failure',
        operator: 'equals',
        value: 'email',
      };

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.save.mockResolvedValue(mockStrategy);

      const result = await service.addCondition('strategy123', newCondition);

      expect(result).toEqual(mockStrategy);
      expect(fallbackStrategyRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.addCondition('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCondition', () => {
    it('should remove condition from strategy successfully', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [
          {
            type: 'channel_failure' as const,
            operator: 'equals' as const,
            value: 'email',
          },
        ],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.save.mockResolvedValue(mockStrategy);

      const result = await service.removeCondition('strategy123', 0);

      expect(result).toEqual(mockStrategy);
      expect(fallbackStrategyRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.removeCondition('nonexistent', 0)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addAction', () => {
    it('should add action to strategy successfully', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      const newAction = {
        type: 'alternative_channel',
        config: { channel: 'sms' },
      };

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.save.mockResolvedValue(mockStrategy);

      const result = await service.addAction('strategy123', newAction);

      expect(result).toEqual(mockStrategy);
      expect(fallbackStrategyRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.addAction('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAction', () => {
    it('should remove action from strategy successfully', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [
          {
            type: 'alternative_channel' as const,
            config: { channel: 'sms' },
          },
        ],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.save.mockResolvedValue(mockStrategy);

      const result = await service.removeAction('strategy123', 0);

      expect(result).toEqual(mockStrategy);
      expect(fallbackStrategyRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.removeAction('nonexistent', 0)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePriority', () => {
    it('should update priority successfully', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.findByPriority.mockResolvedValue(null);
      fallbackStrategyRepository.save.mockResolvedValue(mockStrategy);

      const result = await service.updatePriority('strategy123', 2);

      expect(result).toEqual(mockStrategy);
      expect(fallbackStrategyRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.updatePriority('nonexistent', 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if priority already exists', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      const existingStrategy = FallbackStrategy.create({
        name: 'Existing Strategy',
        isActive: true,
        priority: 2,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);
      fallbackStrategyRepository.findByPriority.mockResolvedValue(existingStrategy);

      await expect(service.updatePriority('strategy123', 2)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFallbackStrategiesByUser', () => {
    it('should return strategies created by user', async () => {
      const mockStrategies = [
        FallbackStrategy.create({
          name: 'User Strategy 1',
          isActive: true,
          priority: 1,
          conditions: [],
          actions: [],
          createdBy: 'user123',
        }),
        FallbackStrategy.create({
          name: 'User Strategy 2',
          isActive: true,
          priority: 2,
          conditions: [],
          actions: [],
          createdBy: 'user123',
        }),
      ];

      fallbackStrategyRepository.findByUser.mockResolvedValue(mockStrategies);

      const result = await service.getFallbackStrategiesByUser('user123');

      expect(result).toEqual(mockStrategies);
      expect(fallbackStrategyRepository.findByUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('searchFallbackStrategies', () => {
    it('should return matching strategies', async () => {
      const mockStrategies = [
        FallbackStrategy.create({
          name: 'Test Strategy 1',
          isActive: true,
          priority: 1,
          conditions: [],
          actions: [],
          createdBy: 'user123',
        }),
        FallbackStrategy.create({
          name: 'Test Strategy 2',
          isActive: true,
          priority: 2,
          conditions: [],
          actions: [],
          createdBy: 'user123',
        }),
      ];

      fallbackStrategyRepository.search.mockResolvedValue(mockStrategies);

      const result = await service.searchFallbackStrategies('test');

      expect(result).toEqual(mockStrategies);
      expect(fallbackStrategyRepository.search).toHaveBeenCalledWith('test');
    });
  });

  describe('bulkUpdateFallbackStrategies', () => {
    it('should update multiple strategies successfully', async () => {
      const mockStrategy1 = FallbackStrategy.create({
        name: 'Strategy 1',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      const mockStrategy2 = FallbackStrategy.create({
        name: 'Strategy 2',
        isActive: true,
        priority: 2,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      const updatedStrategy1 = FallbackStrategy.create({
        name: 'Updated Strategy 1',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      const updatedStrategy2 = FallbackStrategy.create({
        name: 'Updated Strategy 2',
        isActive: true,
        priority: 2,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById
        .mockResolvedValueOnce(mockStrategy1)
        .mockResolvedValueOnce(mockStrategy2);

      fallbackStrategyRepository.save
        .mockResolvedValueOnce(updatedStrategy1)
        .mockResolvedValueOnce(updatedStrategy2);

      const updates = [
        { id: 'strategy1', updates: { name: 'Updated Strategy 1' } },
        { id: 'strategy2', updates: { name: 'Updated Strategy 2' } },
      ];

      const result = await service.bulkUpdateFallbackStrategies(updates);

      expect(result).toEqual([updatedStrategy1, updatedStrategy2]);
      expect(fallbackStrategyRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('bulkDeleteFallbackStrategies', () => {
    it('should delete multiple strategies successfully', async () => {
      const mockStrategy1 = FallbackStrategy.create({
        name: 'Strategy 1',
        isActive: true,
        priority: 1,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      const mockStrategy2 = FallbackStrategy.create({
        name: 'Strategy 2',
        isActive: true,
        priority: 2,
        conditions: [],
        actions: [],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById
        .mockResolvedValueOnce(mockStrategy1)
        .mockResolvedValueOnce(mockStrategy2);

      fallbackStrategyRepository.delete.mockResolvedValue(undefined);

      await service.bulkDeleteFallbackStrategies(['strategy1', 'strategy2']);

      expect(fallbackStrategyRepository.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFallbackStrategyStatistics', () => {
    it('should return strategy statistics', async () => {
      const mockStrategy = FallbackStrategy.create({
        name: 'Test Strategy',
        isActive: true,
        priority: 1,
        conditions: [
          {
            type: 'channel_failure' as const,
            operator: 'equals' as const,
            value: 'email',
          },
        ],
        actions: [
          {
            type: 'alternative_channel' as const,
            config: { channel: 'sms' },
          },
        ],
        createdBy: 'user123',
      });

      fallbackStrategyRepository.findById.mockResolvedValue(mockStrategy);

      const result = await service.getFallbackStrategyStatistics('strategy123');

      expect(result).toHaveProperty('strategy');
      expect(result).toHaveProperty('statistics');
      expect(result.statistics.totalConditions).toBe(1);
      expect(result.statistics.totalActions).toBe(1);
    });

    it('should throw NotFoundException if strategy not found', async () => {
      fallbackStrategyRepository.findById.mockResolvedValue(null);

      await expect(service.getFallbackStrategyStatistics('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
