import { Test, TestingModule } from '@nestjs/testing';
import { ThrottleRuleService } from './throttle-rule.service';
import { ThrottleRuleRepository } from '../../infrastructure/throttle-rule.repository';
import { ThrottleRule } from '../../domain/throttle-rule.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ThrottleRuleService', () => {
  let service: ThrottleRuleService;
  let throttleRuleRepository: jest.Mocked<ThrottleRuleRepository>;

  beforeEach(async () => {
    const mockThrottleRuleRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findMany: jest.fn(),
      findActive: jest.fn(),
      findByType: jest.fn(),
      findByUser: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThrottleRuleService,
        {
          provide: 'ThrottleRuleRepository',
          useValue: mockThrottleRuleRepository,
        },
      ],
    }).compile();

    service = module.get<ThrottleRuleService>(ThrottleRuleService);
    throttleRuleRepository = module.get('ThrottleRuleRepository');
  });

  describe('createThrottleRule', () => {
    it('should create a throttle rule successfully', async () => {
      const createDto = {
        name: 'Test Rule',
        description: 'Test description',
        type: 'rate_limit' as const,
        conditions: [
          {
            field: 'user.id',
            operator: 'equals' as const,
            value: 'user123',
          },
        ],
        limits: [
          {
            window: 60,
            maxCount: 10,
            scope: 'user' as const,
            action: 'block' as const,
          },
        ],
      };

      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        description: 'Test description',
        isActive: true,
        type: 'rate_limit',
        conditions: createDto.conditions,
        limits: createDto.limits,
        createdBy: 'user123',
      });

      throttleRuleRepository.save.mockResolvedValue(mockRule);

      const result = await service.createThrottleRule(createDto, 'user123');

      expect(result).toEqual(mockRule);
      expect(throttleRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no conditions provided', async () => {
      const createDto = {
        name: 'Test Rule',
        type: 'rate_limit' as const,
        conditions: [],
        limits: [
          {
            window: 60,
            maxCount: 10,
            scope: 'user' as const,
            action: 'block' as const,
          },
        ],
      };

      await expect(service.createThrottleRule(createDto, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no limits provided', async () => {
      const createDto = {
        name: 'Test Rule',
        type: 'rate_limit' as const,
        conditions: [
          {
            field: 'user.id',
            operator: 'equals' as const,
            value: 'user123',
          },
        ],
        limits: [],
      };

      await expect(service.createThrottleRule(createDto, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getThrottleRuleById', () => {
    it('should return rule if found', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);

      const result = await service.getThrottleRuleById('rule123');

      expect(result).toEqual(mockRule);
      expect(throttleRuleRepository.findById).toHaveBeenCalledWith('rule123');
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.getThrottleRuleById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateThrottleRule', () => {
    it('should update rule successfully', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      const updates = {
        name: 'Updated Rule',
        description: 'Updated description',
      };

      const updatedRule = ThrottleRule.create({
        name: 'Updated Rule',
        description: 'Updated description',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);
      throttleRuleRepository.save.mockResolvedValue(updatedRule);

      const result = await service.updateThrottleRule('rule123', updates);

      expect(result).toEqual(updatedRule);
      expect(throttleRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.updateThrottleRule('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if conditions is empty', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);

      await expect(service.updateThrottleRule('rule123', { conditions: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if limits is empty', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);

      await expect(service.updateThrottleRule('rule123', { limits: [] })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteThrottleRule', () => {
    it('should delete rule successfully', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);
      throttleRuleRepository.delete.mockResolvedValue(undefined);

      await service.deleteThrottleRule('rule123');

      expect(throttleRuleRepository.findById).toHaveBeenCalledWith('rule123');
      expect(throttleRuleRepository.delete).toHaveBeenCalledWith('rule123');
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.deleteThrottleRule('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateThrottleRule', () => {
    it('should activate rule successfully', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: false,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);
      throttleRuleRepository.save.mockResolvedValue(mockRule);

      const result = await service.activateThrottleRule('rule123');

      expect(result.isActive).toBe(true);
      expect(throttleRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.activateThrottleRule('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateThrottleRule', () => {
    it('should deactivate rule successfully', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);
      throttleRuleRepository.save.mockResolvedValue(mockRule);

      const result = await service.deactivateThrottleRule('rule123');

      expect(result.isActive).toBe(false);
      expect(throttleRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateThrottleRule('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getActiveThrottleRules', () => {
    it('should return active rules', async () => {
      const mockRules = [
        ThrottleRule.create({
          name: 'Rule 1',
          isActive: true,
          type: 'rate_limit',
          conditions: [],
          limits: [],
          createdBy: 'user123',
        }),
        ThrottleRule.create({
          name: 'Rule 2',
          isActive: true,
          type: 'burst_limit',
          conditions: [],
          limits: [],
          createdBy: 'user123',
        }),
      ];

      throttleRuleRepository.findActive.mockResolvedValue(mockRules);

      const result = await service.getActiveThrottleRules();

      expect(result).toEqual(mockRules);
      expect(throttleRuleRepository.findActive).toHaveBeenCalled();
    });
  });

  describe('getThrottleRulesByType', () => {
    it('should return rules by type', async () => {
      const mockRules = [
        ThrottleRule.create({
          name: 'Rate Limit Rule',
          isActive: true,
          type: 'rate_limit',
          conditions: [],
          limits: [],
          createdBy: 'user123',
        }),
      ];

      throttleRuleRepository.findByType.mockResolvedValue(mockRules);

      const result = await service.getThrottleRulesByType('rate_limit');

      expect(result).toEqual(mockRules);
      expect(throttleRuleRepository.findByType).toHaveBeenCalledWith('rate_limit');
    });
  });

  describe('addCondition', () => {
    it('should add condition to rule successfully', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      const newCondition = {
        field: 'user.id',
        operator: 'equals' as const,
        value: 'user123',
      };

      throttleRuleRepository.findById.mockResolvedValue(mockRule);
      throttleRuleRepository.save.mockResolvedValue(mockRule);

      const result = await service.addCondition('rule123', newCondition);

      expect(result).toEqual(mockRule);
      expect(throttleRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.addCondition('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCondition', () => {
    it('should remove condition from rule successfully', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [
          {
            field: 'user.id',
            operator: 'equals' as const,
            value: 'user123',
          },
        ],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);
      throttleRuleRepository.save.mockResolvedValue(mockRule);

      const result = await service.removeCondition('rule123', 0);

      expect(result).toEqual(mockRule);
      expect(throttleRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.removeCondition('nonexistent', 0)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addLimit', () => {
    it('should add limit to rule successfully', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      const newLimit = {
        window: 60,
        maxCount: 10,
        scope: 'user' as const,
        action: 'block' as const,
      };

      throttleRuleRepository.findById.mockResolvedValue(mockRule);
      throttleRuleRepository.save.mockResolvedValue(mockRule);

      const result = await service.addLimit('rule123', newLimit);

      expect(result).toEqual(mockRule);
      expect(throttleRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.addLimit('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeLimit', () => {
    it('should remove limit from rule successfully', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [
          {
            window: 60,
            maxCount: 10,
            scope: 'user' as const,
            action: 'block' as const,
          },
        ],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);
      throttleRuleRepository.save.mockResolvedValue(mockRule);

      const result = await service.removeLimit('rule123', 0);

      expect(result).toEqual(mockRule);
      expect(throttleRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.removeLimit('nonexistent', 0)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getThrottleRulesByUser', () => {
    it('should return rules created by user', async () => {
      const mockRules = [
        ThrottleRule.create({
          name: 'User Rule 1',
          isActive: true,
          type: 'rate_limit',
          conditions: [],
          limits: [],
          createdBy: 'user123',
        }),
        ThrottleRule.create({
          name: 'User Rule 2',
          isActive: true,
          type: 'burst_limit',
          conditions: [],
          limits: [],
          createdBy: 'user123',
        }),
      ];

      throttleRuleRepository.findByUser.mockResolvedValue(mockRules);

      const result = await service.getThrottleRulesByUser('user123');

      expect(result).toEqual(mockRules);
      expect(throttleRuleRepository.findByUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('searchThrottleRules', () => {
    it('should return matching rules', async () => {
      const mockRules = [
        ThrottleRule.create({
          name: 'Test Rule 1',
          isActive: true,
          type: 'rate_limit',
          conditions: [],
          limits: [],
          createdBy: 'user123',
        }),
        ThrottleRule.create({
          name: 'Test Rule 2',
          isActive: true,
          type: 'burst_limit',
          conditions: [],
          limits: [],
          createdBy: 'user123',
        }),
      ];

      throttleRuleRepository.search.mockResolvedValue(mockRules);

      const result = await service.searchThrottleRules('test');

      expect(result).toEqual(mockRules);
      expect(throttleRuleRepository.search).toHaveBeenCalledWith('test');
    });
  });

  describe('bulkUpdateThrottleRules', () => {
    it('should update multiple rules successfully', async () => {
      const mockRule1 = ThrottleRule.create({
        name: 'Rule 1',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      const mockRule2 = ThrottleRule.create({
        name: 'Rule 2',
        isActive: true,
        type: 'burst_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      const updatedRule1 = ThrottleRule.create({
        name: 'Updated Rule 1',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      const updatedRule2 = ThrottleRule.create({
        name: 'Updated Rule 2',
        isActive: true,
        type: 'burst_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById
        .mockResolvedValueOnce(mockRule1)
        .mockResolvedValueOnce(mockRule2);

      throttleRuleRepository.save
        .mockResolvedValueOnce(updatedRule1)
        .mockResolvedValueOnce(updatedRule2);

      const updates = [
        { id: 'rule1', updates: { name: 'Updated Rule 1' } },
        { id: 'rule2', updates: { name: 'Updated Rule 2' } },
      ];

      const result = await service.bulkUpdateThrottleRules(updates);

      expect(result).toEqual([updatedRule1, updatedRule2]);
      expect(throttleRuleRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('bulkDeleteThrottleRules', () => {
    it('should delete multiple rules successfully', async () => {
      const mockRule1 = ThrottleRule.create({
        name: 'Rule 1',
        isActive: true,
        type: 'rate_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      const mockRule2 = ThrottleRule.create({
        name: 'Rule 2',
        isActive: true,
        type: 'burst_limit',
        conditions: [],
        limits: [],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById
        .mockResolvedValueOnce(mockRule1)
        .mockResolvedValueOnce(mockRule2);

      throttleRuleRepository.delete.mockResolvedValue(undefined);

      await service.bulkDeleteThrottleRules(['rule1', 'rule2']);

      expect(throttleRuleRepository.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('getThrottleRuleStatistics', () => {
    it('should return rule statistics', async () => {
      const mockRule = ThrottleRule.create({
        name: 'Test Rule',
        isActive: true,
        type: 'rate_limit',
        conditions: [
          {
            field: 'user.id',
            operator: 'equals' as const,
            value: 'user123',
          },
        ],
        limits: [
          {
            window: 60,
            maxCount: 10,
            scope: 'user' as const,
            action: 'block' as const,
          },
        ],
        createdBy: 'user123',
      });

      throttleRuleRepository.findById.mockResolvedValue(mockRule);

      const result = await service.getThrottleRuleStatistics('rule123');

      expect(result).toHaveProperty('rule');
      expect(result).toHaveProperty('statistics');
      expect(result.statistics.totalConditions).toBe(1);
      expect(result.statistics.totalLimits).toBe(1);
    });

    it('should throw NotFoundException if rule not found', async () => {
      throttleRuleRepository.findById.mockResolvedValue(null);

      await expect(service.getThrottleRuleStatistics('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
