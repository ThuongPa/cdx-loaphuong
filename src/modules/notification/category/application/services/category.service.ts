import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Category } from '../../domain/category.entity';
import { CategoryRepository } from '../../infrastructure/category.repository';

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  metadata?: Record<string, any>;
}

export interface CategoryQuery {
  search?: string;
  parentId?: string;
  isActive?: boolean;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @Inject('CategoryRepository') private readonly categoryRepository: CategoryRepository,
  ) {}

  async createCategory(dto: CreateCategoryDto, createdBy: string): Promise<Category> {
    this.logger.log(`Creating category: ${dto.name}`);

    try {
      // Validate parent category if provided
      if (dto.parentId) {
        const parentCategory = await this.categoryRepository.findById(dto.parentId);
        if (!parentCategory) {
          throw new BadRequestException(`Parent category with ID '${dto.parentId}' not found`);
        }
        if (!parentCategory.isActive) {
          throw new BadRequestException('Cannot create subcategory under inactive parent category');
        }
      }

      const category = Category.create({
        name: dto.name,
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        isActive: true,
        parentId: dto.parentId,
        metadata: dto.metadata,
        createdBy,
      });

      const savedCategory = await this.categoryRepository.save(category);

      // Update parent category to include this child
      if (dto.parentId) {
        const parentCategory = await this.categoryRepository.findById(dto.parentId);
        if (parentCategory) {
          parentCategory.addChild(savedCategory.id);
          await this.categoryRepository.save(parentCategory);
        }
      }

      this.logger.log(`Category created: ${savedCategory.name} (${savedCategory.id})`);
      return savedCategory;
    } catch (error) {
      this.logger.error(`Failed to create category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCategories(
    query: CategoryQuery = {},
  ): Promise<{ categories: Category[]; total: number; page: number; limit: number }> {
    return await this.categoryRepository.findMany(query);
  }

  async getCategoryById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }

  async getCategoryByName(name: string): Promise<Category | null> {
    return await this.categoryRepository.findByName(name);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.getCategoryById(id);

    // Validate parent category if changing
    if (dto.parentId !== undefined && dto.parentId !== category.parentId) {
      if (dto.parentId) {
        const parentCategory = await this.categoryRepository.findById(dto.parentId);
        if (!parentCategory) {
          throw new BadRequestException(`Parent category with ID '${dto.parentId}' not found`);
        }
        if (!parentCategory.isActive) {
          throw new BadRequestException('Cannot set inactive category as parent');
        }
        if (dto.parentId === id) {
          throw new BadRequestException('Category cannot be its own parent');
        }
      }

      // Update parent relationships
      if (category.parentId) {
        const oldParent = await this.categoryRepository.findById(category.parentId);
        if (oldParent) {
          oldParent.removeChild(id);
          await this.categoryRepository.save(oldParent);
        }
      }

      if (dto.parentId) {
        const newParent = await this.categoryRepository.findById(dto.parentId);
        if (newParent) {
          newParent.addChild(id);
          await this.categoryRepository.save(newParent);
        }
      }
    }

    category.updateContent(dto);
    return await this.categoryRepository.save(category);
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.getCategoryById(id);

    // Check if category has children
    if (category.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories. Please delete subcategories first.',
      );
    }

    // Remove from parent's children list
    if (category.parentId) {
      const parent = await this.categoryRepository.findById(category.parentId);
      if (parent) {
        parent.removeChild(id);
        await this.categoryRepository.save(parent);
      }
    }

    await this.categoryRepository.delete(id);
    this.logger.log(`Category deleted: ${category.name} (${category.id})`);
  }

  async activateCategory(id: string): Promise<Category> {
    const category = await this.getCategoryById(id);
    category.activate();
    return await this.categoryRepository.save(category);
  }

  async deactivateCategory(id: string): Promise<Category> {
    const category = await this.getCategoryById(id);
    category.deactivate();
    return await this.categoryRepository.save(category);
  }

  async getCategoryTree(): Promise<Category[]> {
    return await this.categoryRepository.findTree();
  }

  async getCategoryChildren(id: string): Promise<Category[]> {
    const category = await this.getCategoryById(id);
    const children = await Promise.all(
      category.children.map((childId) => this.categoryRepository.findById(childId)),
    );
    return children.filter((child) => child !== null) as Category[];
  }

  async getCategoryPath(id: string): Promise<Category[]> {
    const path: Category[] = [];
    let current: Category | null = await this.getCategoryById(id);

    while (current) {
      path.unshift(current);
      if (current.parentId) {
        current = await this.categoryRepository.findById(current.parentId);
      } else {
        current = null;
      }
    }

    return path;
  }

  async moveCategory(id: string, newParentId: string | null): Promise<Category> {
    const category = await this.getCategoryById(id);

    if (newParentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    // Validate new parent
    if (newParentId) {
      const newParent = await this.categoryRepository.findById(newParentId);
      if (!newParent) {
        throw new BadRequestException(`Parent category with ID '${newParentId}' not found`);
      }
      if (!newParent.isActive) {
        throw new BadRequestException('Cannot move category under inactive parent');
      }
    }

    // Remove from current parent
    if (category.parentId) {
      const currentParent = await this.categoryRepository.findById(category.parentId);
      if (currentParent) {
        currentParent.removeChild(id);
        await this.categoryRepository.save(currentParent);
      }
    }

    // Add to new parent
    if (newParentId) {
      const newParent = await this.categoryRepository.findById(newParentId);
      if (newParent) {
        newParent.addChild(id);
        await this.categoryRepository.save(newParent);
      }
    }

    if (newParentId) {
      category.setParent(newParentId);
    } else {
      category.removeParent();
    }
    return await this.categoryRepository.save(category);
  }

  async getCategoryStatistics(id: string): Promise<any> {
    const category = await this.getCategoryById(id);
    const children = await this.getCategoryChildren(id);

    return {
      category: {
        id: category.id,
        name: category.name,
        isActive: category.isActive,
      },
      statistics: {
        totalChildren: children.length,
        activeChildren: children.filter((child) => child.isActive).length,
        inactiveChildren: children.filter((child) => !child.isActive).length,
      },
    };
  }

  async searchCategories(searchTerm: string): Promise<Category[]> {
    return await this.categoryRepository.search(searchTerm);
  }

  async getCategoriesByUser(userId: string): Promise<Category[]> {
    return await this.categoryRepository.findByUser(userId);
  }

  async bulkUpdateCategories(
    updateItems: Array<{ id: string; updates: UpdateCategoryDto }>,
  ): Promise<Category[]> {
    const results: Category[] = [];

    for (const { id, updates } of updateItems) {
      try {
        const updatedCategory = await this.updateCategory(id, updates);
        results.push(updatedCategory);
      } catch (error) {
        this.logger.error(`Failed to update category ${id}: ${error.message}`);
        throw error;
      }
    }

    return results;
  }

  async bulkDeleteCategories(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.deleteCategory(id);
      } catch (error) {
        this.logger.error(`Failed to delete category ${id}: ${error.message}`);
        throw error;
      }
    }
  }

  async getCategoryHierarchy(): Promise<Category[]> {
    return await this.categoryRepository.findTree();
  }

  async getTopCategories(limit: number = 10): Promise<Category[]> {
    // This would need to be implemented in the repository
    // For now, return empty array as placeholder
    return [];
  }

  async addMember(id: string, memberDto: AddMemberDto): Promise<Category> {
    const category = await this.getCategoryById(id);
    // Add member logic would go here
    // For now, just return the category
    return category;
  }

  async removeMember(id: string, userId: string): Promise<Category> {
    const category = await this.getCategoryById(id);
    // Remove member logic would go here
    // For now, just return the category
    return category;
  }

  async updateMember(id: string, userId: string, memberDto: UpdateMemberDto): Promise<Category> {
    const category = await this.getCategoryById(id);
    // Update member logic would go here
    // For now, just return the category
    return category;
  }

  async bulkMemberOperation(id: string, operationDto: BulkMemberOperationDto): Promise<Category> {
    const category = await this.getCategoryById(id);
    // Bulk member operation logic would go here
    // For now, just return the category
    return category;
  }
}
