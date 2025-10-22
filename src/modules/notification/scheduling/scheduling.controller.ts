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
import { Type } from 'class-transformer';
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
  SchedulingService,
  CreateScheduledNotificationDto,
  UpdateScheduledNotificationDto,
} from './scheduling.service';

@ApiTags('Notification Scheduling')
@Controller('scheduled-notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new scheduled notification' })
  @ApiBody({
    description: 'Scheduled notification creation data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Scheduled notification name' },
        description: { type: 'string', description: 'Scheduled notification description' },
        schedulePattern: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['once', 'recurring', 'cron'],
              description: 'Schedule type',
            },
            cronExpression: { type: 'string', description: 'Cron expression (for cron type)' },
            recurringType: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly'],
              description: 'Recurring type',
            },
            recurringDays: {
              type: 'array',
              items: { type: 'number' },
              description: 'Days of week (0-6)',
            },
            recurringDayOfMonth: { type: 'number', description: 'Day of month (1-31)' },
            timezone: { type: 'string', description: 'Timezone (e.g., America/New_York)' },
            scheduledAt: {
              type: 'string',
              format: 'date-time',
              description: 'Scheduled time (for once type)',
            },
          },
          required: ['type', 'timezone'],
        },
        notificationContent: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Notification title' },
            body: { type: 'string', description: 'Notification body' },
            data: { type: 'object', description: 'Additional data' },
            categoryId: { type: 'string', description: 'Category ID' },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'urgent'],
              description: 'Priority',
            },
            channels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Notification channels',
            },
          },
          required: ['title', 'body'],
        },
        targetAudience: {
          type: 'object',
          properties: {
            userIds: { type: 'array', items: { type: 'string' }, description: 'Specific user IDs' },
            categoryIds: { type: 'array', items: { type: 'string' }, description: 'Category IDs' },
            userSegments: {
              type: 'array',
              items: { type: 'string' },
              description: 'User segments',
            },
            excludeUserIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Excluded user IDs',
            },
          },
        },
        expiresAt: { type: 'string', format: 'date-time', description: 'Expiration date' },
        createdBy: { type: 'string', description: 'Creator user ID' },
      },
      required: ['name', 'schedulePattern', 'notificationContent', 'targetAudience', 'createdBy'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Scheduled notification created successfully',
  })
  async createScheduledNotification(
    @Body() createDto: CreateScheduledNotificationDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const scheduledNotification =
        await this.schedulingService.createScheduledNotification(createDto);

      res.status(HttpStatus.CREATED).json({
        success: true,
        data: scheduledNotification,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to create scheduled notification',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get scheduled notifications with filtering and pagination' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'createdBy', required: false, description: 'Filter by creator' })
  @ApiQuery({ name: 'scheduleType', required: false, description: 'Filter by schedule type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled notifications retrieved successfully',
  })
  async getScheduledNotifications(
    @Query('status') status?: string,
    @Query('isActive') isActive?: boolean,
    @Query('createdBy') createdBy?: string,
    @Query('scheduleType') scheduleType?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const filters = {
        status: status as any,
        isActive,
        createdBy,
        scheduleType,
      };

      const result = await this.schedulingService.getScheduledNotifications(filters, page, limit);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get scheduled notifications',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get scheduled notification statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getScheduledNotificationStatistics(@Res() res: Response): Promise<void> {
    try {
      const statistics = await this.schedulingService.getScheduledNotificationStatistics();

      res.status(HttpStatus.OK).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get statistics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scheduled notification by ID' })
  @ApiParam({ name: 'id', description: 'Scheduled notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled notification retrieved successfully',
  })
  async getScheduledNotificationById(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const scheduledNotification = await this.schedulingService.getScheduledNotificationById(id);

      res.status(HttpStatus.OK).json({
        success: true,
        data: scheduledNotification,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to get scheduled notification',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update scheduled notification' })
  @ApiParam({ name: 'id', description: 'Scheduled notification ID' })
  @ApiBody({
    description: 'Scheduled notification update data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        schedulePattern: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['once', 'recurring', 'cron'] },
            cronExpression: { type: 'string' },
            recurringType: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
            recurringDays: { type: 'array', items: { type: 'number' } },
            recurringDayOfMonth: { type: 'number' },
            timezone: { type: 'string' },
            scheduledAt: { type: 'string', format: 'date-time' },
          },
        },
        notificationContent: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            data: { type: 'object' },
            categoryId: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
            channels: { type: 'array', items: { type: 'string' } },
          },
        },
        targetAudience: {
          type: 'object',
          properties: {
            userIds: { type: 'array', items: { type: 'string' } },
            categoryIds: { type: 'array', items: { type: 'string' } },
            userSegments: { type: 'array', items: { type: 'string' } },
            excludeUserIds: { type: 'array', items: { type: 'string' } },
          },
        },
        expiresAt: { type: 'string', format: 'date-time' },
        isActive: { type: 'boolean' },
        updatedBy: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled notification updated successfully',
  })
  async updateScheduledNotification(
    @Param('id') id: string,
    @Body() updateDto: UpdateScheduledNotificationDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const scheduledNotification = await this.schedulingService.updateScheduledNotification(
        id,
        updateDto,
      );

      res.status(HttpStatus.OK).json({
        success: true,
        data: scheduledNotification,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to update scheduled notification',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post(':id/cancel')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Cancel scheduled notification' })
  @ApiParam({ name: 'id', description: 'Scheduled notification ID' })
  @ApiBody({
    description: 'Cancel request data',
    schema: {
      type: 'object',
      properties: {
        cancelledBy: { type: 'string', description: 'User ID who cancelled' },
      },
      required: ['cancelledBy'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled notification cancelled successfully',
  })
  async cancelScheduledNotification(
    @Param('id') id: string,
    @Body() body: { cancelledBy: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const scheduledNotification = await this.schedulingService.cancelScheduledNotification(
        id,
        body.cancelledBy,
      );

      res.status(HttpStatus.OK).json({
        success: true,
        data: scheduledNotification,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to cancel scheduled notification',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete scheduled notification' })
  @ApiParam({ name: 'id', description: 'Scheduled notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled notification deleted successfully',
  })
  async deleteScheduledNotification(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      await this.schedulingService.deleteScheduledNotification(id);

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Scheduled notification deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: 'Failed to delete scheduled notification',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('validate-schedule')
  @ApiOperation({ summary: 'Validate schedule pattern' })
  @ApiBody({
    description: 'Schedule pattern to validate',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['once', 'recurring', 'cron'] },
        cronExpression: { type: 'string' },
        recurringType: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
        recurringDays: { type: 'array', items: { type: 'number' } },
        recurringDayOfMonth: { type: 'number' },
        timezone: { type: 'string' },
        scheduledAt: { type: 'string', format: 'date-time' },
      },
      required: ['type', 'timezone'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Schedule pattern validation result',
  })
  async validateSchedulePattern(@Body() schedulePattern: any, @Res() res: Response): Promise<void> {
    try {
      const validation = await this.schedulingService.validateSchedulePattern(schedulePattern);

      res.status(HttpStatus.OK).json({
        success: true,
        data: validation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to validate schedule pattern',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
