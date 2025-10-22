import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import {
  HttpStatus,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  CategoryService,
  CreateCategoryDto,
  UpdateCategoryDto,
  AddMemberDto,
  UpdateMemberDto,
  BulkMemberOperationDto,
} from './application/services/category.service';

@ApiTags('Category Management')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiBody({
    description: 'Category creation data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Category name' },
        description: { type: 'string', description: 'Category description' },
        parentId: { type: 'string', description: 'Parent category ID' },
        metadata: {
          type: 'object',
          properties: {
            icon: { type: 'string' },
            color: { type: 'string' },
            priority: { type: 'number' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
  })
  async createCategory(@Body() createDto: CreateCategoryDto, @Res() res: Response): Promise<void> {
    try {
      // TODO: Get createdBy from JWT token
      const createdBy = 'system'; // This should come from the authenticated user
      const category = await this.categoryService.createCategory(createDto, createdBy);

      res.status(HttpStatus.CREATED).json({
        success: true,
        data: category,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to create category',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get categories with filtering and pagination' })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by category name' })
  @ApiQuery({ name: 'parentId', required: false, description: 'Filter by parent category ID' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user membership' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name and description' })
  @ApiQuery({
    name: 'sortField',
    required: false,
    description: 'Sort field (name, createdAt, lastActivityAt, engagementScore, memberCount)',
  })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
  })
  async getCategories(
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: boolean,
    @Query('createdBy') createdBy?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const query = {
        search,
        parentId,
        isActive,
        createdBy,
        page,
        limit,
        sortBy,
        sortOrder,
      };

      const result = await this.categoryService.getCategories(query);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get categories',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get category hierarchy (root categories)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category hierarchy retrieved successfully',
  })
  async getCategoryHierarchy(@Res() res: Response): Promise<void> {
    try {
      const categories = await this.categoryService.getCategoryHierarchy();

      res!.status(HttpStatus.OK).json({
        success: true,
        data: categories,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get category hierarchy',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get category statistics' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Specific category ID for statistics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category statistics retrieved successfully',
  })
  async getCategoryStatistics(
    @Query('categoryId') categoryId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      if (!categoryId) {
        res!.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Category ID is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const statistics = await this.categoryService.getCategoryStatistics(categoryId);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get category statistics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top categories by engagement' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of top categories to return' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Top categories retrieved successfully',
  })
  async getTopCategories(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const categories = await this.categoryService.getTopCategories(limit);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: categories,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get top categories',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category retrieved successfully',
  })
  async getCategoryById(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const category = await this.categoryService.getCategoryById(id);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: category,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to get category',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiBody({
    description: 'Category update data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        parentId: { type: 'string' },
        metadata: {
          type: 'object',
          properties: {
            icon: { type: 'string' },
            color: { type: 'string' },
            priority: { type: 'number' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
  })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateDto: UpdateCategoryDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const category = await this.categoryService.updateCategory(id, updateDto);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: category,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to update category',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category deleted successfully',
  })
  async deleteCategory(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      await this.categoryService.deleteCategory(id);

      res!.status(HttpStatus.OK).json({
        success: true,
        message: 'Category deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to delete category',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post(':id/members')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Add member to category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiBody({
    description: 'Member data',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        role: { type: 'string', enum: ['admin', 'member'], description: 'Member role' },
        metadata: { type: 'object', description: 'Additional member metadata' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Member added successfully',
  })
  async addMember(
    @Param('id') id: string,
    @Body() memberDto: AddMemberDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const category = await this.categoryService.addMember(id, memberDto);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: category,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to add member',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete(':id/members/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Remove member from category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Member removed successfully',
  })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const category = await this.categoryService.removeMember(id, userId);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: category,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to remove member',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put(':id/members/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update member in category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    description: 'Member update data',
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['admin', 'member'] },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Member updated successfully',
  })
  async updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() memberDto: UpdateMemberDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const category = await this.categoryService.updateMember(id, userId, memberDto);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: category,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to update member',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post(':id/members/bulk')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Bulk member operations (add/remove up to 1000 users)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiBody({
    description: 'Bulk member operation data',
    schema: {
      type: 'object',
      properties: {
        userIds: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 1000,
          description: 'List of user IDs (max 1000)',
        },
        operation: {
          type: 'string',
          enum: ['add', 'remove'],
          description: 'Operation type',
        },
        role: { type: 'string', enum: ['admin', 'member'] },
        metadata: { type: 'object' },
      },
      required: ['userIds', 'operation'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk member operation completed successfully',
  })
  async bulkMemberOperation(
    @Param('id') id: string,
    @Body() operationDto: BulkMemberOperationDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const category = await this.categoryService.bulkMemberOperation(id, operationDto);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: category,
        message: `Bulk ${operationDto.operation} operation completed for ${operationDto.userIds.length} users`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to perform bulk member operation',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get categories for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User categories retrieved successfully',
  })
  async getCategoriesByUser(@Param('userId') userId: string, @Res() res: Response): Promise<void> {
    try {
      const categories = await this.categoryService.getCategoriesByUser(userId);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: categories,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get user categories',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
