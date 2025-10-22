import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryService } from '../../../src/modules/notification/category/category.service';
import { CategoryRepository } from '../../../src/modules/notification/category/category.repository';
import {
  Category,
  CategoryDocument,
} from '../../../src/modules/notification/category/category.schema';
import { StructuredLoggerService } from '../../../src/infrastructure/logging/structured-logger.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: CategoryRepository;
  let categoryModel: Model<CategoryDocument>;
  let structuredLogger: StructuredLoggerService;

  const mockCategory = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Category',
    description: 'Test Description',
    parentId: null,
    metadata: {
      icon: 'test-icon',
      color: '#FF0000',
      priority: 1,
      tags: ['test', 'category'],
    },
    members: [],
    isActive: true,
    memberCount: 0,
    notificationCount: 0,
    engagementScore: 0,
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findMany: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMember: jest.fn(),
    findMember: jest.fn(),
    findCategoriesByUser: jest.fn(),
    findChildren: jest.fn(),
    findRootCategories: jest.fn(),
    getStatistics: jest.fn(),
    getTopCategories: jest.fn(),
    updateEngagementScore: jest.fn(),
    incrementNotificationCount: jest.fn(),
  };

  const mockStructuredLogger = {
    logBusinessEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: CategoryRepository,
          useValue: mockRepository,
        },
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        {
          provide: StructuredLoggerService,
          useValue: mockStructuredLogger,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repository = module.get<CategoryRepository>(CategoryRepository);
    categoryModel = module.get<Model<CategoryDocument>>(getModelToken(Category.name));
    structuredLogger = module.get<StructuredLoggerService>(StructuredLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      const createDto = {
        name: 'Test Category',
        description: 'Test Description',
        metadata: {
          icon: 'test-icon',
          color: '#FF0000',
          priority: 1,
          tags: ['test'],
        },
      };

      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCategory);

      const result = await service.createCategory(createDto);

      expect(mockRepository.findByName).toHaveBeenCalledWith('Test Category');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Category',
          description: 'Test Description',
          isActive: true,
          memberCount: 0,
          notificationCount: 0,
          engagementScore: 0,
        }),
      );
      expect(result).toEqual(mockCategory);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'category_created',
        expect.any(Object),
      );
    });

    it('should throw ConflictException if category name already exists', async () => {
      const createDto = {
        name: 'Existing Category',
        description: 'Test Description',
      };

      mockRepository.findByName.mockResolvedValue(mockCategory);

      await expect(service.createCategory(createDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if parent category does not exist', async () => {
      const createDto = {
        name: 'Test Category',
        parentId: '507f1f77bcf86cd799439012',
      };

      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.createCategory(createDto)).rejects.toThrow(NotFoundException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if parent category is inactive', async () => {
      const createDto = {
        name: 'Test Category',
        parentId: '507f1f77bcf86cd799439012',
      };

      const inactiveParent = { ...mockCategory, isActive: false };

      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(inactiveParent);

      await expect(service.createCategory(createDto)).rejects.toThrow(BadRequestException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getCategoryById', () => {
    it('should return category if found', async () => {
      mockRepository.findById.mockResolvedValue(mockCategory);

      const result = await service.getCategoryById('507f1f77bcf86cd799439011');

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getCategoryById('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const updateDto = {
        name: 'Updated Category',
        description: 'Updated Description',
      };

      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.updateById.mockResolvedValue({ ...mockCategory, ...updateDto });

      const result = await service.updateCategory('507f1f77bcf86cd799439011', updateDto);

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRepository.updateById).toHaveBeenCalledWith('507f1f77bcf86cd799439011', updateDto);
      expect(result).toEqual({ ...mockCategory, ...updateDto });
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'category_updated',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      const updateDto = { name: 'Updated Category' };

      mockRepository.findById.mockResolvedValue(null);

      await expect(service.updateCategory('507f1f77bcf86cd799439011', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.updateById).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new name already exists', async () => {
      const updateDto = { name: 'Existing Category' };

      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.findByName.mockResolvedValue(mockCategory);

      await expect(service.updateCategory('507f1f77bcf86cd799439011', updateDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.findChildren.mockResolvedValue([]);
      mockRepository.deleteById.mockResolvedValue(true);

      await service.deleteCategory('507f1f77bcf86cd799439011');

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRepository.findChildren).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRepository.deleteById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'category_deleted',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deleteCategory('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.deleteById).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if category has children', async () => {
      const children = [{ _id: '507f1f77bcf86cd799439012', name: 'Child Category' }];

      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.findChildren.mockResolvedValue(children);

      await expect(service.deleteCategory('507f1f77bcf86cd799439011')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    it('should add member successfully', async () => {
      const memberDto = {
        userId: 'user123',
        role: 'member' as any,
        metadata: { source: 'test' },
      };

      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.findMember.mockResolvedValue(null);
      mockRepository.addMember.mockResolvedValue({ ...mockCategory, members: [memberDto] });

      const result = await service.addMember('507f1f77bcf86cd799439011', memberDto);

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRepository.findMember).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'user123');
      expect(mockRepository.addMember).toHaveBeenCalledWith('507f1f77bcf86cd799439011', memberDto);
      expect(result).toEqual({ ...mockCategory, members: [memberDto] });
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'category_member_added',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      const memberDto = { userId: 'user123' };

      mockRepository.findById.mockResolvedValue(null);

      await expect(service.addMember('507f1f77bcf86cd799439011', memberDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.addMember).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if user is already a member', async () => {
      const memberDto = { userId: 'user123' };
      const existingMember = { category: mockCategory, member: { userId: 'user123' } };

      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.findMember.mockResolvedValue(existingMember);

      await expect(service.addMember('507f1f77bcf86cd799439011', memberDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.addMember).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      const existingMember = { category: mockCategory, member: { userId: 'user123' } };

      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.findMember.mockResolvedValue(existingMember);
      mockRepository.removeMember.mockResolvedValue(mockCategory);

      const result = await service.removeMember('507f1f77bcf86cd799439011', 'user123');

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRepository.findMember).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'user123');
      expect(mockRepository.removeMember).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'user123',
      );
      expect(result).toEqual(mockCategory);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'category_member_removed',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.removeMember('507f1f77bcf86cd799439011', 'user123')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.removeMember).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user is not a member', async () => {
      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.findMember.mockResolvedValue(null);

      await expect(service.removeMember('507f1f77bcf86cd799439011', 'user123')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.removeMember).not.toHaveBeenCalled();
    });
  });

  describe('bulkMemberOperation', () => {
    it('should perform bulk add operation successfully', async () => {
      const operationDto = {
        userIds: ['user1', 'user2', 'user3'],
        operation: 'add' as any,
        role: 'member' as any,
        metadata: { source: 'bulk' },
      };

      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.findMember
        .mockResolvedValueOnce(null) // user1 not found
        .mockResolvedValueOnce(null) // user2 not found
        .mockResolvedValueOnce(null); // user3 not found

      mockRepository.addMember.mockResolvedValue(mockCategory);

      const result = await service.bulkMemberOperation('507f1f77bcf86cd799439011', operationDto);

      expect(mockRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRepository.addMember).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockCategory);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'category_bulk_member_operation',
        expect.any(Object),
      );
    });

    it('should throw BadRequestException if userIds list is empty', async () => {
      const operationDto = {
        userIds: [],
        operation: 'add' as any,
      };

      await expect(
        service.bulkMemberOperation('507f1f77bcf86cd799439011', operationDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if more than 1000 users', async () => {
      const operationDto = {
        userIds: Array.from({ length: 1001 }, (_, i) => `user${i}`),
        operation: 'add' as any,
      };

      await expect(
        service.bulkMemberOperation('507f1f77bcf86cd799439011', operationDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCategoryStatistics', () => {
    it('should return category statistics', async () => {
      const statistics = {
        totalCategories: 10,
        totalMembers: 100,
        totalNotifications: 500,
        avgEngagementScore: 75.5,
        activeCategories: 8,
      };

      mockRepository.getStatistics.mockResolvedValue([statistics]);

      const result = await service.getCategoryStatistics();

      expect(mockRepository.getStatistics).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(statistics);
    });

    it('should return default statistics if no data', async () => {
      mockRepository.getStatistics.mockResolvedValue([]);

      const result = await service.getCategoryStatistics();

      expect(result).toEqual({
        totalCategories: 0,
        totalMembers: 0,
        totalNotifications: 0,
        avgEngagementScore: 0,
        activeCategories: 0,
      });
    });
  });
});
