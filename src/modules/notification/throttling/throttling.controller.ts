import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Document, Types } from 'mongoose';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { ThrottlingService } from './throttling.service';
import { CreateThrottlingRuleDto } from './dto/create-throttling-rule.dto';
import { UpdateThrottlingRuleDto } from './dto/update-throttling-rule.dto';
import { CheckThrottlingDto } from './dto/check-throttling.dto';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import {
  ThrottlingRule,
  ThrottlingRuleDocument,
  ThrottlingType,
  ThrottlingScope,
} from './throttling.schema';

@ApiTags('Throttling & Rate Limiting')
@Controller('throttling')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class ThrottlingController {
  constructor(private readonly throttlingService: ThrottlingService) {}

  @Post('rules')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new throttling rule' })
  @ApiBody({
    description: 'Throttling rule creation data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Rule name' },
        description: { type: 'string', description: 'Rule description' },
        type: {
          type: 'string',
          enum: ['user_based', 'global', 'channel_based', 'category_based', 'priority_based'],
          description: 'Rule type',
        },
        scope: {
          type: 'string',
          enum: ['per_user', 'per_ip', 'per_device', 'global'],
          description: 'Rule scope',
        },
        limits: {
          type: 'object',
          properties: {
            maxNotifications: { type: 'number' },
            timeWindowMs: { type: 'number' },
            burstLimit: { type: 'number' },
            burstWindowMs: { type: 'number' },
            cooldownMs: { type: 'number' },
          },
          description: 'Rate limits',
        },
        conditions: {
          type: 'object',
          properties: {
            channels: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } },
            priorities: { type: 'array', items: { type: 'string' } },
            userSegments: { type: 'array', items: { type: 'string' } },
            timeRestrictions: {
              type: 'object',
              properties: {
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                timezone: { type: 'string' },
                daysOfWeek: { type: 'array', items: { type: 'number' } },
              },
            },
            customRules: { type: 'object' },
          },
          description: 'Rule conditions',
        },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['name', 'type', 'scope', 'limits'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Throttling rule created successfully',
  })
  async createRule(
    @Body() createDto: CreateThrottlingRuleDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const rule = await this.throttlingService.createRule(createDto as any, 'system'); // TODO: Get from auth context

      res!.status(HttpStatus.CREATED).json({
        success: true,
        data: rule,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to create throttling rule',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get throttling rules with filtering and pagination' })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by rule name' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by rule type' })
  @ApiQuery({ name: 'scope', required: false, description: 'Filter by rule scope' })
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
    description: 'Sort field (name, createdAt, lastHitAt, hitCount, blockCount)',
  })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Throttling rules retrieved successfully',
  })
  async getRules(
    @Query('name') name?: string,
    @Query('type') type?: string,
    @Query('scope') scope?: string,
    @Query('status') status?: string,
    @Query('createdBy') createdBy?: string,
    @Query('search') search?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const filters = {
        name,
        type: type as any,
        scope: scope as any,
        status: status as any,
        createdBy,
        search,
      };

      const sort = {
        field: (sortField as any) || 'createdAt',
        order: (sortOrder as any) || 'desc',
      };

      const pagination = { page, limit };

      const result = await this.throttlingService.getRules(filters, sort, pagination);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get throttling rules',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get throttling rule by ID' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Throttling rule retrieved successfully',
  })
  async getRuleById(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const rule = await this.throttlingService.getRuleById(id);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: rule,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to get throttling rule',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put('rules/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update throttling rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiBody({
    description: 'Throttling rule update data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        limits: {
          type: 'object',
          properties: {
            maxNotifications: { type: 'number' },
            timeWindowMs: { type: 'number' },
            burstLimit: { type: 'number' },
            burstWindowMs: { type: 'number' },
            cooldownMs: { type: 'number' },
          },
        },
        conditions: {
          type: 'object',
          properties: {
            channels: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } },
            priorities: { type: 'array', items: { type: 'string' } },
            userSegments: { type: 'array', items: { type: 'string' } },
            timeRestrictions: {
              type: 'object',
              properties: {
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                timezone: { type: 'string' },
                daysOfWeek: { type: 'array', items: { type: 'number' } },
              },
            },
            customRules: { type: 'object' },
          },
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'suspended'],
        },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Throttling rule updated successfully',
  })
  async updateRule(
    @Param('id') id: string,
    @Body() updateDto: UpdateThrottlingRuleDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const rule = await this.throttlingService.updateRule(id, updateDto, 'system'); // TODO: Get from auth context

      res!.status(HttpStatus.OK).json({
        success: true,
        data: rule,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to update throttling rule',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete('rules/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete throttling rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Throttling rule deleted successfully',
  })
  async deleteRule(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      await this.throttlingService.deleteRule(id);

      res!.status(HttpStatus.OK).json({
        success: true,
        message: 'Throttling rule deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to delete throttling rule',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('check')
  @ApiOperation({ summary: 'Check throttling for a request' })
  @ApiBody({
    description: 'Throttling check data',
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', description: 'Request identifier' },
        scope: {
          type: 'string',
          enum: ['per_user', 'per_ip', 'per_device', 'global'],
          description: 'Request scope',
        },
        notificationData: {
          type: 'object',
          properties: {
            channel: { type: 'string' },
            category: { type: 'string' },
            priority: { type: 'string' },
            userSegment: { type: 'string' },
            userId: { type: 'string' },
            deviceId: { type: 'string' },
            ipAddress: { type: 'string' },
            userAgent: { type: 'string' },
          },
          description: 'Notification data',
        },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['identifier', 'scope', 'notificationData'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Throttling check completed',
  })
  async checkThrottling(@Body() checkDto: CheckThrottlingDto, @Res() res: Response): Promise<void> {
    try {
      const result = await this.throttlingService.checkThrottling(checkDto as any);

      if (!result.allowed) {
        res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          success: false,
          data: result,
          timestamp: new Date().toISOString(),
        });
      } else {
        res!.status(HttpStatus.OK).json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to check throttling',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('profiles')
  @ApiOperation({ summary: 'Create user throttling profile' })
  @ApiBody({
    description: 'User profile data',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        limits: {
          type: 'object',
          properties: {
            maxNotificationsPerDay: { type: 'number' },
            maxNotificationsPerHour: { type: 'number' },
            maxNotificationsPerMinute: { type: 'number' },
            maxBurstNotifications: { type: 'number' },
            burstWindowMs: { type: 'number' },
            cooldownMs: { type: 'number' },
          },
          description: 'User limits',
        },
        behavior: {
          type: 'object',
          properties: {
            averageNotificationsPerDay: { type: 'number' },
            peakHour: { type: 'number' },
            preferredChannels: { type: 'array', items: { type: 'string' } },
            engagementScore: { type: 'number' },
            lastActiveAt: { type: 'string', format: 'date-time' },
            notificationFrequency: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'very_high'],
            },
          },
          description: 'User behavior',
        },
        restrictions: {
          type: 'object',
          properties: {
            quietHours: {
              type: 'object',
              properties: {
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                timezone: { type: 'string' },
              },
            },
            blockedChannels: { type: 'array', items: { type: 'string' } },
            blockedCategories: { type: 'array', items: { type: 'string' } },
            maxPriority: { type: 'string' },
            emergencyOverride: { type: 'boolean' },
          },
          description: 'User restrictions',
        },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['userId', 'limits', 'behavior', 'restrictions'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User profile created successfully',
  })
  async createUserProfile(
    @Body() createDto: CreateUserProfileDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const profile = await this.throttlingService.createUserProfile(createDto as any);

      res!.status(HttpStatus.CREATED).json({
        success: true,
        data: profile,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to create user profile',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('profiles/:userId')
  @ApiOperation({ summary: 'Get user throttling profile' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
  })
  async getUserProfile(@Param('userId') userId: string, @Res() res: Response): Promise<void> {
    try {
      const profile = await this.throttlingService.getUserProfile(userId);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: profile,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to get user profile',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put('profiles/:userId')
  @ApiOperation({ summary: 'Update user throttling profile' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    description: 'User profile update data',
    schema: {
      type: 'object',
      properties: {
        limits: {
          type: 'object',
          properties: {
            maxNotificationsPerDay: { type: 'number' },
            maxNotificationsPerHour: { type: 'number' },
            maxNotificationsPerMinute: { type: 'number' },
            maxBurstNotifications: { type: 'number' },
            burstWindowMs: { type: 'number' },
            cooldownMs: { type: 'number' },
          },
        },
        behavior: {
          type: 'object',
          properties: {
            averageNotificationsPerDay: { type: 'number' },
            peakHour: { type: 'number' },
            preferredChannels: { type: 'array', items: { type: 'string' } },
            engagementScore: { type: 'number' },
            lastActiveAt: { type: 'string', format: 'date-time' },
            notificationFrequency: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'very_high'],
            },
          },
        },
        restrictions: {
          type: 'object',
          properties: {
            quietHours: {
              type: 'object',
              properties: {
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                timezone: { type: 'string' },
              },
            },
            blockedChannels: { type: 'array', items: { type: 'string' } },
            blockedCategories: { type: 'array', items: { type: 'string' } },
            maxPriority: { type: 'string' },
            emergencyOverride: { type: 'boolean' },
          },
        },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully',
  })
  async updateUserProfile(
    @Param('userId') userId: string,
    @Body() updateData: Partial<CreateUserProfileDto>,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const profile = await this.throttlingService.updateUserProfile(userId, updateData as any);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: profile,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to update user profile',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get throttling statistics' })
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
      const statistics = await this.throttlingService.getThrottlingStatistics(targetDate);

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

  @Post('cleanup')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Cleanup old throttling records' })
  @ApiQuery({
    name: 'daysOld',
    required: false,
    description: 'Number of days old to cleanup (default: 30)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cleanup completed successfully',
  })
  async cleanupOldRecords(
    @Query('daysOld', new DefaultValuePipe(30), ParseIntPipe) daysOld: number,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const deletedCount = await this.throttlingService.cleanupOldRecords(daysOld);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: { deletedCount },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to cleanup old records',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
