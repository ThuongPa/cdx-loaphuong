import { CategoryService } from './category.service';
import { Injectable, Get, Res, Logger } from '@nestjs/common';

export interface CategoryTargetingOptions {
  categoryIds: string[];
  includeSubcategories?: boolean;
  excludeUsers?: string[];
  includeOnlyActive?: boolean;
}

export interface CategoryTargetingResult {
  userIds: string[];
  categoryDetails: Array<{
    categoryId: string;
    categoryName: string;
    memberCount: number;
  }>;
  totalTargetedUsers: number;
}

@Injectable()
export class CategoryTargetingService {
  private readonly logger = new Logger(CategoryTargetingService.name);

  constructor(
    private readonly categoryService: CategoryService,
    // private readonly structuredLogger: StructuredLoggerService,
  ) {}

  async getTargetUsers(options: CategoryTargetingOptions): Promise<CategoryTargetingResult> {
    try {
      const {
        categoryIds,
        includeSubcategories = false,
        excludeUsers = [],
        includeOnlyActive = true,
      } = options;

      if (categoryIds.length === 0) {
        return {
          userIds: [],
          categoryDetails: [],
          totalTargetedUsers: 0,
        };
      }

      const allUserIds = new Set<string>();
      const categoryDetails = [];

      // Process each category
      for (const categoryId of categoryIds) {
        const category = await this.categoryService.getCategoryById(categoryId);

        if (!category) {
          this.logger.warn(`Category with ID '${categoryId}' not found, skipping`);
          continue;
        }

        if (includeOnlyActive && !category.isActive) {
          this.logger.warn(`Category '${category.name}' is inactive, skipping`);
          continue;
        }

        // Get users from this category
        const categoryUsers = category.members
          .filter((member) => !excludeUsers.includes(member.userId))
          .map((member) => member.userId);

        categoryUsers.forEach((userId) => allUserIds.add(userId));

        categoryDetails.push({
          categoryId: (category._id as any).toString(),
          categoryName: category.name,
          memberCount: categoryUsers.length,
        });

        // Include subcategories if requested
        if (includeSubcategories) {
          const subcategoryUsers = await this.getSubcategoryUsers(
            categoryId,
            excludeUsers,
            includeOnlyActive,
          );
          subcategoryUsers.forEach((userId) => allUserIds.add(userId));
        }
      }

      const userIds = Array.from(allUserIds);

      // this.structuredLogger.logBusinessEvent('category_targeting_executed', {
      //   categoryIds,
      //   includeSubcategories,
      //   totalTargetedUsers: userIds.length,
      //   excludedUsers: excludeUsers.length,
      // });

      this.logger.log(
        `Category targeting completed: ${userIds.length} users from ${categoryIds.length} categories`,
      );

      return {
        userIds,
        categoryDetails,
        totalTargetedUsers: userIds.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get target users: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUsersByCategory(categoryId: string, excludeUsers: string[] = []): Promise<string[]> {
    try {
      const category = await this.categoryService.getCategoryById(categoryId);
      if (!category) {
        throw new Error(`Category with ID '${categoryId}' not found`);
      }

      return category.members
        .filter((member) => !excludeUsers.includes(member.userId))
        .map((member) => member.userId);
    } catch (error) {
      this.logger.error(`Failed to get users by category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUsersByMultipleCategories(
    categoryIds: string[],
    excludeUsers: string[] = [],
  ): Promise<string[]> {
    try {
      const allUserIds = new Set<string>();

      for (const categoryId of categoryIds) {
        const categoryUsers = await this.getUsersByCategory(categoryId, excludeUsers);
        categoryUsers.forEach((userId) => allUserIds.add(userId));
      }

      return Array.from(allUserIds);
    } catch (error) {
      this.logger.error(
        `Failed to get users by multiple categories: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getCategoryEngagementMetrics(categoryId: string): Promise<{
    categoryId: string;
    categoryName: string;
    memberCount: number;
    engagementScore: number;
    notificationCount: number;
    lastActivityAt: Date;
    activeMembers: number;
  }> {
    try {
      const category = await this.categoryService.getCategoryById(categoryId);
      if (!category) {
        throw new Error(`Category with ID '${categoryId}' not found`);
      }

      // Calculate active members (members who have been active recently)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeMembers = category.members.filter((_) => {
        // This is a simplified calculation - in a real implementation,
        // you would track member activity timestamps
        return true; // For now, consider all members as active
      }).length;

      return {
        categoryId: (category._id as any).toString(),
        categoryName: category.name,
        memberCount: category.memberCount,
        engagementScore: category.engagementScore,
        notificationCount: category.notificationCount,
        lastActivityAt: category.lastActivityAt || new Date(),
        activeMembers,
      };
    } catch (error) {
      this.logger.error(`Failed to get category engagement metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateCategoryEngagement(
    categoryId: string,
    engagementData: {
      notificationSent?: boolean;
      userInteraction?: boolean;
      memberActivity?: boolean;
    },
  ): Promise<void> {
    try {
      const category = await this.categoryService.getCategoryById(categoryId);
      if (!category) {
        throw new Error(`Category with ID '${categoryId}' not found`);
      }

      let newEngagementScore = category.engagementScore;

      // Update engagement score based on activities
      if (engagementData.notificationSent) {
        newEngagementScore += 1;
        await this.categoryService.incrementNotificationCount(categoryId);
      }

      if (engagementData.userInteraction) {
        newEngagementScore += 2;
      }

      if (engagementData.memberActivity) {
        newEngagementScore += 1;
      }

      // Apply decay factor (reduce score over time)
      const daysSinceLastActivity = Math.floor(
        (Date.now() - (category.lastActivityAt || new Date()).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceLastActivity > 0) {
        newEngagementScore = Math.max(0, newEngagementScore - daysSinceLastActivity * 0.1);
      }

      await this.categoryService.updateEngagementScore(categoryId, newEngagementScore);

      // this.structuredLogger.logBusinessEvent('category_engagement_updated', {
      //   categoryId,
      //   oldScore: category.engagementScore,
      //   newScore: newEngagementScore,
      //   engagementData,
      // });

      this.logger.log(
        `Category engagement updated: ${category.name} (${categoryId}) - Score: ${newEngagementScore}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update category engagement: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTopEngagedCategories(limit: number = 10): Promise<
    Array<{
      categoryId: string;
      categoryName: string;
      engagementScore: number;
      memberCount: number;
      notificationCount: number;
    }>
  > {
    try {
      const topCategories = await this.categoryService.getTopCategories(limit);

      return topCategories.map((category) => ({
        categoryId: (category._id as any).toString(),
        categoryName: category.name,
        engagementScore: category.engagementScore,
        memberCount: category.memberCount,
        notificationCount: category.notificationCount,
      }));
    } catch (error) {
      this.logger.error(`Failed to get top engaged categories: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getSubcategoryUsers(
    parentCategoryId: string,
    excludeUsers: string[] = [],
    includeOnlyActive: boolean = true,
  ): Promise<string[]> {
    try {
      const subcategories = await this.categoryService.getCategories({
        parentId: parentCategoryId,
        isActive: includeOnlyActive,
      });

      const allUserIds = new Set<string>();

      for (const subcategory of subcategories.categories) {
        const subcategoryUsers = subcategory.members
          .filter((member) => !excludeUsers.includes(member.userId))
          .map((member) => member.userId);

        subcategoryUsers.forEach((userId) => allUserIds.add(userId));

        // Recursively get users from sub-subcategories
        const subSubcategoryUsers = await this.getSubcategoryUsers(
          (subcategory._id as any).toString(),
          excludeUsers,
          includeOnlyActive,
        );
        subSubcategoryUsers.forEach((userId) => allUserIds.add(userId));
      }

      return Array.from(allUserIds);
    } catch (error) {
      this.logger.error(`Failed to get subcategory users: ${error.message}`, error.stack);
      return [];
    }
  }
}
