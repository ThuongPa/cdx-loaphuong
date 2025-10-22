import { Test, TestingModule } from '@nestjs/testing';
import { CategoryTargetingService } from '../../../src/modules/notification/category/category-targeting.service';
import { CategoryService } from '../../../src/modules/notification/category/category.service';
import { StructuredLoggerService } from '../../../src/infrastructure/logging/structured-logger.service';

describe('CategoryTargetingService', () => {
  let service: CategoryTargetingService;
  let categoryService: CategoryService;
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
    members: [
      { userId: 'user1', joinedAt: new Date(), role: 'member', metadata: {} },
      { userId: 'user2', joinedAt: new Date(), role: 'admin', metadata: {} },
      { userId: 'user3', joinedAt: new Date(), role: 'member', metadata: {} },
    ],
    isActive: true,
    memberCount: 3,
    notificationCount: 10,
    engagementScore: 75.5,
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryService = {
    getCategoryById: jest.fn(),
    getCategories: jest.fn(),
    updateEngagementScore: jest.fn(),
    incrementNotificationCount: jest.fn(),
    getTopCategories: jest.fn(),
  };

  const mockStructuredLogger = {
    logBusinessEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryTargetingService,
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
        {
          provide: StructuredLoggerService,
          useValue: mockStructuredLogger,
        },
      ],
    }).compile();

    service = module.get<CategoryTargetingService>(CategoryTargetingService);
    categoryService = module.get<CategoryService>(CategoryService);
    structuredLogger = module.get<StructuredLoggerService>(StructuredLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTargetUsers', () => {
    it('should return target users from single category', async () => {
      const options = {
        categoryIds: ['507f1f77bcf86cd799439011'],
        includeSubcategories: false,
        excludeUsers: [],
        includeOnlyActive: true,
      };

      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);

      const result = await service.getTargetUsers(options);

      expect(mockCategoryService.getCategoryById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result.userIds).toEqual(['user1', 'user2', 'user3']);
      expect(result.categoryDetails).toHaveLength(1);
      expect(result.categoryDetails[0]).toEqual({
        categoryId: '507f1f77bcf86cd799439011',
        categoryName: 'Test Category',
        memberCount: 3,
      });
      expect(result.totalTargetedUsers).toBe(3);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'category_targeting_executed',
        expect.any(Object),
      );
    });

    it('should return target users from multiple categories', async () => {
      const category2 = {
        ...mockCategory,
        _id: '507f1f77bcf86cd799439012',
        name: 'Test Category 2',
        members: [
          { userId: 'user4', joinedAt: new Date(), role: 'member', metadata: {} },
          { userId: 'user5', joinedAt: new Date(), role: 'member', metadata: {} },
        ],
        memberCount: 2,
      };

      const options = {
        categoryIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        includeSubcategories: false,
        excludeUsers: [],
        includeOnlyActive: true,
      };

      mockCategoryService.getCategoryById
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(category2);

      const result = await service.getTargetUsers(options);

      expect(mockCategoryService.getCategoryById).toHaveBeenCalledTimes(2);
      expect(result.userIds).toEqual(['user1', 'user2', 'user3', 'user4', 'user5']);
      expect(result.categoryDetails).toHaveLength(2);
      expect(result.totalTargetedUsers).toBe(5);
    });

    it('should exclude specified users', async () => {
      const options = {
        categoryIds: ['507f1f77bcf86cd799439011'],
        includeSubcategories: false,
        excludeUsers: ['user1', 'user3'],
        includeOnlyActive: true,
      };

      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);

      const result = await service.getTargetUsers(options);

      expect(result.userIds).toEqual(['user2']);
      expect(result.totalTargetedUsers).toBe(1);
    });

    it('should skip inactive categories when includeOnlyActive is true', async () => {
      const inactiveCategory = { ...mockCategory, isActive: false };

      const options = {
        categoryIds: ['507f1f77bcf86cd799439011'],
        includeSubcategories: false,
        excludeUsers: [],
        includeOnlyActive: true,
      };

      mockCategoryService.getCategoryById.mockResolvedValue(inactiveCategory);

      const result = await service.getTargetUsers(options);

      expect(result.userIds).toEqual([]);
      expect(result.categoryDetails).toHaveLength(0);
      expect(result.totalTargetedUsers).toBe(0);
    });

    it('should return empty result for empty category IDs', async () => {
      const options = {
        categoryIds: [],
        includeSubcategories: false,
        excludeUsers: [],
        includeOnlyActive: true,
      };

      const result = await service.getTargetUsers(options);

      expect(result.userIds).toEqual([]);
      expect(result.categoryDetails).toEqual([]);
      expect(result.totalTargetedUsers).toBe(0);
    });

    it('should handle missing categories gracefully', async () => {
      const options = {
        categoryIds: ['507f1f77bcf86cd799439011', 'nonexistent'],
        includeSubcategories: false,
        excludeUsers: [],
        includeOnlyActive: true,
      };

      mockCategoryService.getCategoryById
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(null);

      const result = await service.getTargetUsers(options);

      expect(result.userIds).toEqual(['user1', 'user2', 'user3']);
      expect(result.categoryDetails).toHaveLength(1);
      expect(result.totalTargetedUsers).toBe(3);
    });
  });

  describe('getUsersByCategory', () => {
    it('should return users from a specific category', async () => {
      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);

      const result = await service.getUsersByCategory('507f1f77bcf86cd799439011');

      expect(mockCategoryService.getCategoryById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(['user1', 'user2', 'user3']);
    });

    it('should exclude specified users', async () => {
      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);

      const result = await service.getUsersByCategory('507f1f77bcf86cd799439011', [
        'user1',
        'user3',
      ]);

      expect(result).toEqual(['user2']);
    });

    it('should throw error if category not found', async () => {
      mockCategoryService.getCategoryById.mockResolvedValue(null);

      await expect(service.getUsersByCategory('nonexistent')).rejects.toThrow(
        "Category with ID 'nonexistent' not found",
      );
    });
  });

  describe('getUsersByMultipleCategories', () => {
    it('should return unique users from multiple categories', async () => {
      const category2 = {
        ...mockCategory,
        _id: '507f1f77bcf86cd799439012',
        members: [
          { userId: 'user3', joinedAt: new Date(), role: 'member', metadata: {} }, // Duplicate
          { userId: 'user4', joinedAt: new Date(), role: 'member', metadata: {} },
        ],
      };

      mockCategoryService.getCategoryById
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(category2);

      const result = await service.getUsersByMultipleCategories([
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
      ]);

      expect(result).toEqual(['user1', 'user2', 'user3', 'user4']);
    });
  });

  describe('getCategoryEngagementMetrics', () => {
    it('should return category engagement metrics', async () => {
      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);

      const result = await service.getCategoryEngagementMetrics('507f1f77bcf86cd799439011');

      expect(mockCategoryService.getCategoryById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual({
        categoryId: '507f1f77bcf86cd799439011',
        categoryName: 'Test Category',
        memberCount: 3,
        engagementScore: 75.5,
        notificationCount: 10,
        lastActivityAt: mockCategory.lastActivityAt,
        activeMembers: 3,
      });
    });

    it('should throw error if category not found', async () => {
      mockCategoryService.getCategoryById.mockResolvedValue(null);

      await expect(service.getCategoryEngagementMetrics('nonexistent')).rejects.toThrow(
        "Category with ID 'nonexistent' not found",
      );
    });
  });

  describe('updateCategoryEngagement', () => {
    it('should update engagement score for notification sent', async () => {
      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);
      mockCategoryService.incrementNotificationCount.mockResolvedValue(mockCategory);
      mockCategoryService.updateEngagementScore.mockResolvedValue(mockCategory);

      await service.updateCategoryEngagement('507f1f77bcf86cd799439011', {
        notificationSent: true,
        userInteraction: false,
        memberActivity: false,
      });

      expect(mockCategoryService.getCategoryById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockCategoryService.incrementNotificationCount).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(mockCategoryService.updateEngagementScore).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        76.5,
      );
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'category_engagement_updated',
        expect.any(Object),
      );
    });

    it('should update engagement score for user interaction', async () => {
      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);
      mockCategoryService.updateEngagementScore.mockResolvedValue(mockCategory);

      await service.updateCategoryEngagement('507f1f77bcf86cd799439011', {
        notificationSent: false,
        userInteraction: true,
        memberActivity: false,
      });

      expect(mockCategoryService.updateEngagementScore).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        77.5,
      );
    });

    it('should apply decay factor for old categories', async () => {
      const oldCategory = {
        ...mockCategory,
        lastActivityAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      mockCategoryService.getCategoryById.mockResolvedValue(oldCategory);
      mockCategoryService.updateEngagementScore.mockResolvedValue(oldCategory);

      await service.updateCategoryEngagement('507f1f77bcf86cd799439011', {
        notificationSent: true,
        userInteraction: false,
        memberActivity: false,
      });

      // Should apply decay: 75.5 + 1 - (10 * 0.1) = 75.5
      expect(mockCategoryService.updateEngagementScore).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        75.5,
      );
    });
  });

  describe('getTopEngagedCategories', () => {
    it('should return top engaged categories', async () => {
      const topCategories = [
        { ...mockCategory, engagementScore: 90 },
        {
          ...mockCategory,
          _id: '507f1f77bcf86cd799439012',
          name: 'Category 2',
          engagementScore: 80,
        },
      ];

      mockCategoryService.getTopCategories.mockResolvedValue(topCategories);

      const result = await service.getTopEngagedCategories(5);

      expect(mockCategoryService.getTopCategories).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        categoryId: '507f1f77bcf86cd799439011',
        categoryName: 'Test Category',
        engagementScore: 90,
        memberCount: 3,
        notificationCount: 10,
      });
    });
  });
});
