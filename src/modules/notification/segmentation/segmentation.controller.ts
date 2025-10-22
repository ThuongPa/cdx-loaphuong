import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { SegmentationService } from './segmentation.service';
import {
  ParseIntPipe,
  DefaultValuePipe,
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  CreateUserSegmentDto,
  UpdateUserSegmentDto,
  EvaluateUserDto,
} from './segmentation.service';

@ApiTags('Segmentation & Targeting')
@Controller('segmentation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class SegmentationController {
  constructor(private readonly segmentationService: SegmentationService) {}

  @Post('segments')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new user segment' })
  @ApiBody({
    description: 'User segment creation data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Segment name' },
        description: { type: 'string', description: 'Segment description' },
        type: {
          type: 'string',
          enum: [
            'behavior_based',
            'preference_based',
            'demographic',
            'geographic',
            'temporal',
            'engagement',
            'custom',
          ],
          description: 'Segment type',
        },
        criteria: {
          type: 'object',
          properties: {
            rules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  operator: {
                    type: 'string',
                    enum: [
                      'equals',
                      'not_equals',
                      'contains',
                      'not_contains',
                      'greater_than',
                      'less_than',
                      'greater_than_or_equal',
                      'less_than_or_equal',
                      'in',
                      'not_in',
                      'regex',
                      'date_range',
                      'time_range',
                    ],
                  },
                  value: { type: 'any' },
                  weight: { type: 'number' },
                },
              },
            },
            logic: { type: 'string', enum: ['AND', 'OR', 'CUSTOM'] },
            customExpression: { type: 'string' },
          },
          description: 'Segment criteria',
        },
        targeting: {
          type: 'object',
          properties: {
            channels: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } },
            priorities: { type: 'array', items: { type: 'string' } },
            timeRestrictions: {
              type: 'object',
              properties: {
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                timezone: { type: 'string' },
                daysOfWeek: { type: 'array', items: { type: 'number' } },
              },
            },
            frequencyLimits: {
              type: 'object',
              properties: {
                maxNotificationsPerDay: { type: 'number' },
                maxNotificationsPerHour: { type: 'number' },
                cooldownMs: { type: 'number' },
              },
            },
          },
          description: 'Targeting configuration',
        },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['name', 'type', 'criteria', 'targeting'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User segment created successfully',
  })
  async createSegment(
    @Body() createDto: CreateUserSegmentDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const segment = await this.segmentationService.createUserSegment(createDto, 'system'); // TODO: Get from auth context

      res.status(HttpStatus.CREATED).json({
        success: true,
        data: segment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to create user segment',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('segments')
  @ApiOperation({ summary: 'Get user segments with filtering and pagination' })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by segment name' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by segment type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'createdBy', required: false, description: 'Filter by creator' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in name and description',
  })
  @ApiQuery({
    name: 'sortField',
    required: false,
    description: 'Sort field (name, createdAt, memberCount, engagementScore)',
  })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User segments retrieved successfully',
  })
  async getSegments(
    @Query('name') name?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('createdBy') createdBy?: string,
    @Query('search') search?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const filters = {
        name,
        type: type as any,
        status: status as any,
        createdBy,
        search,
      };

      const sort = {
        field: (sortField as any) || 'createdAt',
        order: (sortOrder as any) || 'desc',
      };

      const pagination = { page, limit };

      const result = await this.segmentationService.getSegments(filters, sort, pagination);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get user segments',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('segments/:id')
  @ApiOperation({ summary: 'Get user segment by ID' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User segment retrieved successfully',
  })
  async getSegmentById(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const segment = await this.segmentationService.getSegmentById(id);

      res.status(HttpStatus.OK).json({
        success: true,
        data: segment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to get user segment',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put('segments/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update user segment' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiBody({
    description: 'User segment update data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        criteria: {
          type: 'object',
          properties: {
            rules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  operator: { type: 'string' },
                  value: { type: 'any' },
                  weight: { type: 'number' },
                },
              },
            },
            logic: { type: 'string', enum: ['AND', 'OR', 'CUSTOM'] },
            customExpression: { type: 'string' },
          },
        },
        targeting: {
          type: 'object',
          properties: {
            channels: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } },
            priorities: { type: 'array', items: { type: 'string' } },
            timeRestrictions: {
              type: 'object',
              properties: {
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                timezone: { type: 'string' },
                daysOfWeek: { type: 'array', items: { type: 'number' } },
              },
            },
            frequencyLimits: {
              type: 'object',
              properties: {
                maxNotificationsPerDay: { type: 'number' },
                maxNotificationsPerHour: { type: 'number' },
                cooldownMs: { type: 'number' },
              },
            },
          },
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'draft', 'archived'],
        },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User segment updated successfully',
  })
  async updateSegment(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserSegmentDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const segment = await this.segmentationService.updateSegment(id, updateDto, 'system'); // TODO: Get from auth context

      res.status(HttpStatus.OK).json({
        success: true,
        data: segment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to update user segment',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete('segments/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete user segment' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User segment deleted successfully',
  })
  async deleteSegment(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      await this.segmentationService.deleteSegment(id);

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'User segment deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to delete user segment',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('segments/:id/activate')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Activate user segment' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User segment activated successfully',
  })
  async activateSegment(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const segment = await this.segmentationService.activateSegment(id, 'system'); // TODO: Get from auth context

      res.status(HttpStatus.OK).json({
        success: true,
        data: segment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to activate user segment',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('segments/:id/members')
  @ApiOperation({ summary: 'Get segment members' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Segment members retrieved successfully',
  })
  async getSegmentMembers(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const members = await this.segmentationService.getSegmentMembers(id);

      res.status(HttpStatus.OK).json({
        success: true,
        data: members,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to get segment members',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('segments/:id/members')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Add user to segment' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiBody({
    description: 'User data',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        userProfile: {
          type: 'object',
          properties: {
            demographics: {
              type: 'object',
              properties: {
                age: { type: 'number' },
                gender: { type: 'string' },
                location: {
                  type: 'object',
                  properties: {
                    country: { type: 'string' },
                    city: { type: 'string' },
                    timezone: { type: 'string' },
                  },
                },
                language: { type: 'string' },
              },
            },
            behavior: {
              type: 'object',
              properties: {
                lastActiveAt: { type: 'string', format: 'date-time' },
                engagementScore: { type: 'number' },
                notificationFrequency: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'very_high'],
                },
                preferredChannels: { type: 'array', items: { type: 'string' } },
                preferredCategories: { type: 'array', items: { type: 'string' } },
                averageResponseTime: { type: 'number' },
                clickRate: { type: 'number' },
                openRate: { type: 'number' },
              },
            },
            preferences: {
              type: 'object',
              properties: {
                channels: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      channel: { type: 'string' },
                      enabled: { type: 'boolean' },
                      priority: { type: 'number' },
                    },
                  },
                },
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      enabled: { type: 'boolean' },
                      priority: { type: 'number' },
                    },
                  },
                },
                timeRestrictions: {
                  type: 'object',
                  properties: {
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                    timezone: { type: 'string' },
                    daysOfWeek: { type: 'array', items: { type: 'number' } },
                  },
                },
                frequencyLimits: {
                  type: 'object',
                  properties: {
                    maxNotificationsPerDay: { type: 'number' },
                    maxNotificationsPerHour: { type: 'number' },
                    cooldownMs: { type: 'number' },
                  },
                },
              },
            },
          },
          description: 'User profile',
        },
      },
      required: ['userId', 'userProfile'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User added to segment successfully',
  })
  async addUserToSegment(
    @Param('id') id: string,
    @Body() body: { userId: string; userProfile: any },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const member = await this.segmentationService.addUserToSegment(
        id,
        body.userId,
        body.userProfile,
      );

      res.status(HttpStatus.CREATED).json({
        success: true,
        data: member,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to add user to segment',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete('segments/:id/members/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Remove user from segment' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User removed from segment successfully',
  })
  async removeUserFromSegment(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.segmentationService.removeUserFromSegment(id, userId);

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'User removed from segment successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to remove user from segment',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate user for targeting' })
  @ApiBody({
    description: 'User evaluation data',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        userProfile: {
          type: 'object',
          properties: {
            demographics: {
              type: 'object',
              properties: {
                age: { type: 'number' },
                gender: { type: 'string' },
                location: {
                  type: 'object',
                  properties: {
                    country: { type: 'string' },
                    city: { type: 'string' },
                    timezone: { type: 'string' },
                  },
                },
                language: { type: 'string' },
              },
            },
            behavior: {
              type: 'object',
              properties: {
                lastActiveAt: { type: 'string', format: 'date-time' },
                engagementScore: { type: 'number' },
                notificationFrequency: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'very_high'],
                },
                preferredChannels: { type: 'array', items: { type: 'string' } },
                preferredCategories: { type: 'array', items: { type: 'string' } },
                averageResponseTime: { type: 'number' },
                clickRate: { type: 'number' },
                openRate: { type: 'number' },
              },
            },
            preferences: {
              type: 'object',
              properties: {
                channels: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      channel: { type: 'string' },
                      enabled: { type: 'boolean' },
                      priority: { type: 'number' },
                    },
                  },
                },
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      enabled: { type: 'boolean' },
                      priority: { type: 'number' },
                    },
                  },
                },
                timeRestrictions: {
                  type: 'object',
                  properties: {
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                    timezone: { type: 'string' },
                    daysOfWeek: { type: 'array', items: { type: 'number' } },
                  },
                },
                frequencyLimits: {
                  type: 'object',
                  properties: {
                    maxNotificationsPerDay: { type: 'number' },
                    maxNotificationsPerHour: { type: 'number' },
                    cooldownMs: { type: 'number' },
                  },
                },
              },
            },
          },
          description: 'User profile',
        },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['userId', 'userProfile'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User evaluation completed successfully',
  })
  async evaluateUser(@Body() evaluateDto: EvaluateUserDto, @Res() res: Response): Promise<void> {
    try {
      const result = await this.segmentationService.evaluateUser(evaluateDto);

      res.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to evaluate user',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get segmentation statistics' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date for statistics (default: today)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(@Query('date') date?: string, @Res() res?: Response): Promise<void> {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const statistics = await this.segmentationService.getSegmentationStatistics(targetDate);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get statistics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
