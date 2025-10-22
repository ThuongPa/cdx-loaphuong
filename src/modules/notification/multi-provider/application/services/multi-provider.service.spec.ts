import { Test, TestingModule } from '@nestjs/testing';
import { MultiProviderService } from './multi-provider.service';
import { MultiProviderRepository } from '../../infrastructure/multi-provider.repository';
import { MultiProvider } from '../../domain/multi-provider.entity';

describe('MultiProviderService', () => {
  let service: MultiProviderService;
  let mockRepository: jest.Mocked<MultiProviderRepository>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByType: jest.fn(),
      findActive: jest.fn(),
      findByPriority: jest.fn(),
      getStatistics: jest.fn(),
      export: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiProviderService,
        {
          provide: 'MultiProviderRepository',
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<MultiProviderService>(MultiProviderService);
    mockRepository = module.get('MultiProviderRepository');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMultiProvider', () => {
    it('should create a multi-provider', async () => {
      const createDto = {
        name: 'Test Provider',
        type: 'email' as const,
        config: { apiKey: 'test-key', endpoint: 'https://api.test.com' },
        priority: 1,
        fallbackProviders: ['provider-2'],
        rateLimit: { requests: 100, window: 60 },
        retryConfig: { maxRetries: 3, backoffStrategy: 'exponential' as const, baseDelay: 1000 },
        healthCheck: { enabled: true, interval: 30, timeout: 5000, endpoint: '/health' },
        metadata: { environment: 'test' },
        createdBy: 'test-user',
      };

      const expectedProvider = MultiProvider.create({
        name: 'Test Provider',
        type: 'email',
        config: { apiKey: 'test-key', endpoint: 'https://api.test.com' },
        isActive: true,
        priority: 1,
        fallbackProviders: ['provider-2'],
        rateLimit: { requests: 100, window: 60 },
        retryConfig: { maxRetries: 3, backoffStrategy: 'exponential', baseDelay: 1000 },
        healthCheck: { enabled: true, interval: 30, timeout: 5000, endpoint: '/health' },
        metadata: { environment: 'test' },
      });

      mockRepository.create.mockResolvedValue(expectedProvider);

      const result = await service.createMultiProvider(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          type: createDto.type,
          config: createDto.config,
          priority: createDto.priority,
          fallbackProviders: createDto.fallbackProviders,
          rateLimit: createDto.rateLimit,
          retryConfig: createDto.retryConfig,
          healthCheck: createDto.healthCheck,
          metadata: createDto.metadata,
        }),
      );
      expect(result).toEqual(expectedProvider);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const createDto = {
        name: '',
        type: 'email' as const,
        config: {},
        priority: -1,
        createdBy: 'test-user',
      };

      await expect(service.createMultiProvider(createDto)).rejects.toThrow(
        'Name and type are required',
      );
    });
  });

  describe('getMultiProviderById', () => {
    it('should return a multi-provider by id', async () => {
      const providerId = 'test-id';
      const expectedProvider = MultiProvider.create({
        name: 'Test Provider',
        type: 'email',
        config: { apiKey: 'test-key' },
        isActive: true,
        priority: 1,
      });

      mockRepository.findById.mockResolvedValue(expectedProvider);

      const result = await service.getMultiProviderById(providerId);

      expect(mockRepository.findById).toHaveBeenCalledWith(providerId);
      expect(result).toEqual(expectedProvider);
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getMultiProviderById('non-existent-id')).rejects.toThrow(
        'Multi-provider with ID non-existent-id not found',
      );
    });
  });

  describe('getMultiProviderByName', () => {
    it('should return a multi-provider by name', async () => {
      const providerName = 'test-provider';
      const expectedProvider = MultiProvider.create({
        name: 'test-provider',
        type: 'email',
        config: { apiKey: 'test-key' },
        isActive: true,
        priority: 1,
      });

      mockRepository.findByName.mockResolvedValue(expectedProvider);

      const result = await service.getMultiProviderByName(providerName);

      expect(mockRepository.findByName).toHaveBeenCalledWith(providerName);
      expect(result).toEqual(expectedProvider);
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockRepository.findByName.mockResolvedValue(null);

      await expect(service.getMultiProviderByName('non-existent-provider')).rejects.toThrow(
        'Multi-provider with name non-existent-provider not found',
      );
    });
  });

  describe('getMultiProviders', () => {
    it('should return paginated multi-providers', async () => {
      const filters = {
        name: 'test',
        type: 'email',
        isActive: true,
        priority: 1,
        limit: 10,
        offset: 0,
      };

      const expectedResult = {
        multiProviders: [
          MultiProvider.create({
            name: 'Test Provider',
            type: 'email',
            config: { apiKey: 'test-key' },
            isActive: true,
            priority: 1,
          }),
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockRepository.find.mockResolvedValue(expectedResult);

      const result = await service.getMultiProviders(filters);

      expect(mockRepository.find).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateMultiProvider', () => {
    it('should update a multi-provider', async () => {
      const id = 'test-id';
      const updateDto = {
        name: 'Updated Provider',
        config: { apiKey: 'updated-key' },
        priority: 2,
        updatedBy: 'test-user',
      };

      const existingProvider = MultiProvider.create({
        name: 'Test Provider',
        type: 'email',
        config: { apiKey: 'test-key' },
        isActive: true,
        priority: 1,
      });

      const updatedProvider = MultiProvider.create({
        name: 'Updated Provider',
        type: 'email',
        config: { apiKey: 'updated-key' },
        isActive: true,
        priority: 2,
      });

      mockRepository.findById.mockResolvedValue(existingProvider);
      mockRepository.update.mockResolvedValue(updatedProvider);

      const result = await service.updateMultiProvider(id, updateDto);

      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRepository.update).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          props: expect.objectContaining({
            config: { apiKey: 'updated-key', name: 'Updated Provider' },
            priority: 2,
          }),
        }),
      );
      expect(result).toEqual(updatedProvider);
    });
  });

  describe('deleteMultiProvider', () => {
    it('should delete a multi-provider', async () => {
      const id = 'test-id';
      const existingProvider = MultiProvider.create({
        name: 'Test Provider',
        type: 'email',
        config: { apiKey: 'test-key' },
        isActive: true,
        priority: 1,
      });

      mockRepository.findById.mockResolvedValue(existingProvider);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.deleteMultiProvider(id);

      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRepository.delete).toHaveBeenCalledWith(id);
    });
  });

  describe('getMultiProvidersByType', () => {
    it('should return multi-providers by type', async () => {
      const type = 'email';
      const expectedProviders = [
        MultiProvider.create({
          name: 'Email Provider 1',
          type: 'email',
          config: { apiKey: 'test-key-1' },
          isActive: true,
          priority: 1,
        }),
        MultiProvider.create({
          name: 'Email Provider 2',
          type: 'email',
          config: { apiKey: 'test-key-2' },
          isActive: true,
          priority: 2,
        }),
      ];

      mockRepository.findByType.mockResolvedValue(expectedProviders);

      const result = await service.getMultiProvidersByType(type);

      expect(mockRepository.findByType).toHaveBeenCalledWith(type);
      expect(result).toEqual(expectedProviders);
    });
  });

  describe('getActiveMultiProviders', () => {
    it('should return active multi-providers', async () => {
      const expectedProviders = [
        MultiProvider.create({
          name: 'Active Provider 1',
          type: 'email',
          config: { apiKey: 'test-key-1' },
          isActive: true,
          priority: 1,
        }),
        MultiProvider.create({
          name: 'Active Provider 2',
          type: 'sms',
          config: { apiKey: 'test-key-2' },
          isActive: true,
          priority: 2,
        }),
      ];

      mockRepository.findActive.mockResolvedValue(expectedProviders);

      const result = await service.getActiveMultiProviders();

      expect(mockRepository.findActive).toHaveBeenCalled();
      expect(result).toEqual(expectedProviders);
    });
  });

  describe('getMultiProvidersByPriority', () => {
    it('should return multi-providers by priority', async () => {
      const expectedProviders = [
        MultiProvider.create({
          name: 'High Priority Provider',
          type: 'email',
          config: { apiKey: 'test-key-1' },
          isActive: true,
          priority: 1,
        }),
        MultiProvider.create({
          name: 'Low Priority Provider',
          type: 'sms',
          config: { apiKey: 'test-key-2' },
          isActive: true,
          priority: 2,
        }),
      ];

      mockRepository.findByPriority.mockResolvedValue(expectedProviders);

      const result = await service.getMultiProvidersByPriority();

      expect(mockRepository.findByPriority).toHaveBeenCalled();
      expect(result).toEqual(expectedProviders);
    });
  });

  describe('activateMultiProvider', () => {
    it('should activate a multi-provider', async () => {
      const id = 'test-id';
      const existingProvider = MultiProvider.create({
        name: 'Test Provider',
        type: 'email',
        config: { apiKey: 'test-key' },
        isActive: false,
        priority: 1,
      });

      const activatedProvider = MultiProvider.create({
        name: 'Test Provider',
        type: 'email',
        config: { apiKey: 'test-key' },
        isActive: true,
        priority: 1,
      });

      mockRepository.findById.mockResolvedValue(existingProvider);
      mockRepository.update.mockResolvedValue(activatedProvider);

      const result = await service.activateMultiProvider(id);

      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRepository.update).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          isActive: true,
        }),
      );
      expect(result).toEqual(activatedProvider);
    });
  });

  describe('deactivateMultiProvider', () => {
    it('should deactivate a multi-provider', async () => {
      const id = 'test-id';
      const existingProvider = MultiProvider.create({
        name: 'Test Provider',
        type: 'email',
        config: { apiKey: 'test-key' },
        isActive: true,
        priority: 1,
      });

      const deactivatedProvider = MultiProvider.create({
        name: 'Test Provider',
        type: 'email',
        config: { apiKey: 'test-key' },
        isActive: false,
        priority: 1,
      });

      mockRepository.findById.mockResolvedValue(existingProvider);
      mockRepository.update.mockResolvedValue(deactivatedProvider);

      const result = await service.deactivateMultiProvider(id);

      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRepository.update).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          isActive: false,
        }),
      );
      expect(result).toEqual(deactivatedProvider);
    });
  });

  describe('getMultiProviderHealth', () => {
    it('should return health status', async () => {
      const id = 'test-id';
      const existingProvider = MultiProvider.create({
        name: 'Test Provider',
        type: 'email',
        config: { apiKey: 'test-key' },
        isActive: true,
        priority: 1,
      });

      mockRepository.findById.mockResolvedValue(existingProvider);

      const result = await service.getMultiProviderHealth(id);

      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual({
        isHealthy: true,
        status: 'healthy',
        lastCheck: expect.any(Date),
        responseTime: 100,
        errorRate: 0.01,
      });
    });
  });

  describe('getMultiProviderStatistics', () => {
    it('should return statistics', async () => {
      const expectedStats = {
        total: 10,
        byType: { email: 5, sms: 3, push: 2 },
        active: 8,
        inactive: 2,
        averagePriority: 1.5,
      };

      mockRepository.getStatistics.mockResolvedValue(expectedStats);

      const result = await service.getMultiProviderStatistics();

      expect(mockRepository.getStatistics).toHaveBeenCalled();
      expect(result).toEqual(expectedStats);
    });
  });

  describe('bulkUpdateMultiProviders', () => {
    it('should update multiple multi-providers', async () => {
      const updates = [
        { id: 'provider-1', updates: { name: 'Updated Provider 1', updatedBy: 'test-user' } },
        { id: 'provider-2', updates: { priority: 2, updatedBy: 'test-user' } },
      ];

      const updatedProviders = [
        MultiProvider.create({
          name: 'Updated Provider 1',
          type: 'email',
          config: { apiKey: 'test-key-1' },
          isActive: true,
          priority: 1,
        }),
        MultiProvider.create({
          name: 'Provider 2',
          type: 'sms',
          config: { apiKey: 'test-key-2' },
          isActive: true,
          priority: 2,
        }),
      ];

      mockRepository.findById.mockResolvedValueOnce(updatedProviders[0]);
      mockRepository.update.mockResolvedValueOnce(updatedProviders[0]);
      mockRepository.findById.mockResolvedValueOnce(updatedProviders[1]);
      mockRepository.update.mockResolvedValueOnce(updatedProviders[1]);

      const result = await service.bulkUpdateMultiProviders(updates);

      expect(result).toEqual(updatedProviders);
    });
  });

  describe('exportMultiProviders', () => {
    it('should export multi-providers', async () => {
      const filters = { name: 'test', limit: 10, offset: 0 };
      const format = 'json' as const;

      const expectedResult = {
        data: [
          MultiProvider.create({
            name: 'Test Provider',
            type: 'email',
            config: { apiKey: 'test-key' },
            isActive: true,
            priority: 1,
          }),
        ],
        format: 'json',
        count: 1,
        timestamp: new Date(),
      };

      mockRepository.export.mockResolvedValue(expectedResult);

      const result = await service.exportMultiProviders(filters, format);

      expect(mockRepository.export).toHaveBeenCalledWith(filters, format);
      expect(result).toEqual(expectedResult);
    });
  });
});
