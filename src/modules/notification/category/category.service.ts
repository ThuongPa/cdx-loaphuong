import { Category, CategoryDocument } from './category.schema';
import {
  NotFoundException,
  BadRequestException,
  Injectable,
  Get,
  Query,
  Res,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { Document, Types } from 'mongoose';
import { Type } from 'class-transformer';
import {
  CategoryRepository,
  CategoryFilters,
  CategorySortOptions,
  CategoryPaginationOptions,
  CategoryQueryResult,
} from './category.repository';

export interface CreateCategoryDto {
  name: string;
  description?: string;
  parentId?: string;
  metadata?: {
    icon?: string;
    color?: string;
    priority?: number;
    tags?: string[];
  };
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  parentId?: string;
  metadata?: {
    icon?: string;
    color?: string;
    priority?: number;
    tags?: string[];
  };
  isActive?: boolean;
}

export interface AddMemberDto {
  userId: string;
  role?: 'admin' | 'member';
  metadata?: Record<string, any>;
}

export interface UpdateMemberDto {
  role?: 'admin' | 'member';
  metadata?: Record<string, any>;
}

export interface BulkMemberOperationDto {
  userIds: string[];
  operation: 'add' | 'remove';
  role?: 'admin' | 'member';
  metadata?: Record<string, any>;
}

export interface CategoryStatistics {
  totalCategories: number;
  totalMembers: number;
  totalNotifications: number;
  avgEngagementScore: number;
  activeCategories: number;
}

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    private readonly categoryRepository: CategoryRepository,
    // private readonly structuredLogger: StructuredLoggerService,
  ) {}

  async createCategory(createDto: CreateCategoryDto): Promise<CategoryDocument> {
    try {
      // Check if category with same name already exists
      const existingCategory = await this.categoryRepository.findByName(createDto.name);
      if (existingCategory) {
        throw new ConflictException(`Category with name '${createDto.name}' already exists`);
      }

      // Validate parent category if provided
      if (createDto.parentId) {
        const parentCategory = await this.categoryRepository.findById(createDto.parentId);
        if (!parentCategory) {
          throw new NotFoundException(`Parent category with ID '${createDto.parentId}' not found`);
        }
        if (!parentCategory.isActive) {
          throw new BadRequestException('Cannot create category under inactive parent');
        }
      }

      const category = await this.categoryRepository.create({
        ...createDto,
        parentId: createDto.parentId ? (createDto.parentId as any) : null,
        isActive: true,
        // memberCount: 0, // This property is now handled by the entity
        notificationCount: 0,
        engagementScore: 0,
        lastActivityAt: new Date(),
      });

      // this.structuredLogger.logBusinessEvent('category_created', {
      //   categoryId: category._id,
      //   name: category.name,
      //   parentId: category.parentId,
      // });

      this.logger.log(`Category created: ${category.name} (${category._id})`);
      return category;
    } catch (error) {
      this.logger.error(`Failed to create category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCategoryById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }

  async getCategories(
    filters: CategoryFilters = {},
    sort: CategorySortOptions = { field: 'createdAt', order: 'desc' },
    pagination: CategoryPaginationOptions = { page: 1, limit: 10 },
  ): Promise<CategoryQueryResult> {
    return this.categoryRepository.findMany(filters, sort, pagination);
  }

  async updateCategory(id: string, updateDto: UpdateCategoryDto): Promise<CategoryDocument> {
    try {
      const existingCategory = await this.categoryRepository.findById(id);
      if (!existingCategory) {
        throw new NotFoundException(`Category with ID '${id}' not found`);
      }

      // Check for name conflicts if name is being updated
      if (updateDto.name && updateDto.name !== existingCategory.name) {
        const nameConflict = await this.categoryRepository.findByName(updateDto.name);
        if (nameConflict) {
          throw new ConflictException(`Category with name '${updateDto.name}' already exists`);
        }
      }

      // Validate parent category if being updated
      if (updateDto.parentId !== undefined) {
        if (updateDto.parentId && updateDto.parentId !== existingCategory.parentId?.toString()) {
          const parentCategory = await this.categoryRepository.findById(updateDto.parentId);
          if (!parentCategory) {
            throw new NotFoundException(
              `Parent category with ID '${updateDto.parentId}' not found`,
            );
          }
          if (!parentCategory.isActive) {
            throw new BadRequestException('Cannot set inactive category as parent');
          }
          // Prevent circular references
          if (updateDto.parentId === id) {
            throw new BadRequestException('Category cannot be its own parent');
          }
        }
      }

      const updatedCategory = await this.categoryRepository.updateById(id, {
        ...updateDto,
        parentId: updateDto.parentId ? (updateDto.parentId as any) : undefined,
      });
      if (!updatedCategory) {
        throw new NotFoundException(`Category with ID '${id}' not found`);
      }

      // this.structuredLogger.logBusinessEvent('category_updated', {
      //   categoryId: id,
      //   changes: updateDto,
      // });

      this.logger.log(`Category updated: ${updatedCategory.name} (${id})`);
      return updatedCategory;
    } catch (error) {
      this.logger.error(`Failed to update category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new NotFoundException(`Category with ID '${id}' not found`);
      }

      // Check if category has children
      const children = await this.categoryRepository.findChildren(id);
      if (children.length > 0) {
        throw new BadRequestException('Cannot delete category with child categories');
      }

      const deleted = await this.categoryRepository.deleteById(id);
      if (!deleted) {
        throw new NotFoundException(`Category with ID '${id}' not found`);
      }

      // this.structuredLogger.logBusinessEvent('category_deleted', {
      //   categoryId: id,
      //   name: category.name,
      //   memberCount: category.memberCount,
      // });

      this.logger.log(`Category deleted: ${category.name} (${id})`);
    } catch (error) {
      this.logger.error(`Failed to delete category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addMember(categoryId: string, memberDto: AddMemberDto): Promise<CategoryDocument> {
    try {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID '${categoryId}' not found`);
      }

      // Check if user is already a member
      const existingMember = await this.categoryRepository.findMember(categoryId, memberDto.userId);
      if (existingMember) {
        throw new ConflictException('User is already a member of this category');
      }

      const updatedCategory = await this.categoryRepository.addMember(categoryId, memberDto);
      if (!updatedCategory) {
        throw new NotFoundException(`Category with ID '${categoryId}' not found`);
      }

      // this.structuredLogger.logBusinessEvent('category_member_added', {
      //   categoryId,
      //   userId: memberDto.userId,
      //   role: memberDto.role || 'member',
      // });

      this.logger.log(`Member added to category: ${memberDto.userId} -> ${categoryId}`);
      return updatedCategory;
    } catch (error) {
      this.logger.error(`Failed to add member: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeMember(categoryId: string, userId: string): Promise<CategoryDocument> {
    try {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID '${categoryId}' not found`);
      }

      const member = await this.categoryRepository.findMember(categoryId, userId);
      if (!member) {
        throw new NotFoundException('User is not a member of this category');
      }

      const updatedCategory = await this.categoryRepository.removeMember(categoryId, userId);
      if (!updatedCategory) {
        throw new NotFoundException(`Category with ID '${categoryId}' not found`);
      }

      // this.structuredLogger.logBusinessEvent('category_member_removed', {
      //   categoryId,
      //   userId,
      // });

      this.logger.log(`Member removed from category: ${userId} -> ${categoryId}`);
      return updatedCategory;
    } catch (error) {
      this.logger.error(`Failed to remove member: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateMember(
    categoryId: string,
    userId: string,
    memberDto: UpdateMemberDto,
  ): Promise<CategoryDocument> {
    try {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID '${categoryId}' not found`);
      }

      const member = await this.categoryRepository.findMember(categoryId, userId);
      if (!member) {
        throw new NotFoundException('User is not a member of this category');
      }

      const updatedCategory = await this.categoryRepository.updateMember(
        categoryId,
        userId,
        memberDto,
      );
      if (!updatedCategory) {
        throw new NotFoundException(`Category with ID '${categoryId}' not found`);
      }

      // this.structuredLogger.logBusinessEvent('category_member_updated', {
      //   categoryId,
      //   userId,
      //   changes: memberDto,
      // });

      this.logger.log(`Member updated in category: ${userId} -> ${categoryId}`);
      return updatedCategory;
    } catch (error) {
      this.logger.error(`Failed to update member: ${error.message}`, error.stack);
      throw error;
    }
  }

  async bulkMemberOperation(
    categoryId: string,
    operationDto: BulkMemberOperationDto,
  ): Promise<CategoryDocument> {
    try {
      if (operationDto.userIds.length === 0) {
        throw new BadRequestException('User IDs list cannot be empty');
      }

      if (operationDto.userIds.length > 1000) {
        throw new BadRequestException('Cannot process more than 1000 users at once');
      }

      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID '${categoryId}' not found`);
      }

      let updatedCategory = category;

      if (operationDto.operation === 'add') {
        // Add multiple members
        for (const userId of operationDto.userIds) {
          const existingMember = await this.categoryRepository.findMember(categoryId, userId);
          if (!existingMember) {
            await this.categoryRepository.addMember(categoryId, {
              userId,
              role: operationDto.role || 'member',
              metadata: operationDto.metadata || {},
            });
          }
        }
      } else if (operationDto.operation === 'remove') {
        // Remove multiple members
        for (const userId of operationDto.userIds) {
          const existingMember = await this.categoryRepository.findMember(categoryId, userId);
          if (existingMember) {
            await this.categoryRepository.removeMember(categoryId, userId);
          }
        }
      }

      // Get updated category
      const foundCategory = await this.categoryRepository.findById(categoryId);
      if (!foundCategory) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      updatedCategory = foundCategory;

      // this.structuredLogger.logBusinessEvent('category_bulk_member_operation', {
      //   categoryId,
      //   operation: operationDto.operation,
      //   userIds: operationDto.userIds,
      //   count: operationDto.userIds.length,
      // });

      this.logger.log(
        `Bulk member operation completed: ${operationDto.operation} ${operationDto.userIds.length} users -> ${categoryId}`,
      );
      return updatedCategory;
    } catch (error) {
      this.logger.error(`Failed to perform bulk member operation: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCategoriesByUser(userId: string): Promise<CategoryDocument[]> {
    return this.categoryRepository.findCategoriesByUser(userId);
  }

  async getCategoryHierarchy(): Promise<CategoryDocument[]> {
    return this.categoryRepository.findRootCategories();
  }

  async getCategoryStatistics(categoryId?: string): Promise<CategoryStatistics> {
    const stats = await this.categoryRepository.getStatistics(categoryId);
    return (
      stats[0] || {
        totalCategories: 0,
        totalMembers: 0,
        totalNotifications: 0,
        avgEngagementScore: 0,
        activeCategories: 0,
      }
    );
  }

  async getTopCategories(limit: number = 10): Promise<CategoryDocument[]> {
    return this.categoryRepository.getTopCategories(limit);
  }

  async updateEngagementScore(categoryId: string, score: number): Promise<CategoryDocument> {
    const updatedCategory = await this.categoryRepository.updateEngagementScore(categoryId, score);
    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID '${categoryId}' not found`);
    }
    return updatedCategory;
  }

  async incrementNotificationCount(categoryId: string): Promise<CategoryDocument> {
    const updatedCategory = await this.categoryRepository.incrementNotificationCount(categoryId);
    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID '${categoryId}' not found`);
    }
    return updatedCategory;
  }
}
