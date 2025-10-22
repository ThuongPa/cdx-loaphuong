import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { AnalyticsEventType, AnalyticsMetricType } from './analytics.schema';
import { AggregationPeriod } from './analytics-aggregation.schema';
import {
  HttpStatus,
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { Type } from 'class-transformer';
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
  AnalyticsService,
  CreateAnalyticsDto,
  AnalyticsReportDto,
  AnalyticsInsightsDto,
} from './analytics.service';

@ApiTags('Analytics & Reporting')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track analytics event' })
  @ApiBody({
    description: 'Analytics event data',
    schema: {
      type: 'object',
      properties: {
        eventType: {
          type: 'string',
          enum: Object.values(AnalyticsEventType),
          description: 'Event type',
        },
        metricType: {
          type: 'string',
          enum: Object.values(AnalyticsMetricType),
          description: 'Metric type',
        },
        metricName: { type: 'string', description: 'Metric name' },
        value: { type: 'number', description: 'Metric value' },
        dimensions: {
          type: 'object',
          description: 'Event dimensions',
          properties: {
            userId: { type: 'string' },
            notificationId: { type: 'string' },
            channel: { type: 'string' },
            category: { type: 'string' },
            priority: { type: 'string' },
            templateId: { type: 'string' },
            campaignId: { type: 'string' },
            deviceType: { type: 'string' },
            userSegment: { type: 'string' },
            timezone: { type: 'string' },
          },
        },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['eventType', 'metricType', 'metricName', 'value'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Analytics event tracked successfully',
  })
  async trackEvent(@Body() createDto: CreateAnalyticsDto, @Res() res: Response): Promise<void> {
    try {
      const analytics = await this.analyticsService.trackEvent(createDto);

      res!.status(HttpStatus.CREATED).json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to track analytics event',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('track/bulk')
  @ApiOperation({ summary: 'Track multiple analytics events' })
  @ApiBody({
    description: 'Bulk analytics events data',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              eventType: { type: 'string', enum: Object.values(AnalyticsEventType) },
              metricType: { type: 'string', enum: Object.values(AnalyticsMetricType) },
              metricName: { type: 'string' },
              value: { type: 'number' },
              dimensions: { type: 'object' },
              metadata: { type: 'object' },
            },
            required: ['eventType', 'metricType', 'metricName', 'value'],
          },
          maxItems: 1000,
          description: 'Array of analytics events (max 1000)',
        },
      },
      required: ['events'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk analytics events tracked successfully',
  })
  async trackBulkEvents(
    @Body() body: { events: CreateAnalyticsDto[] },
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const analytics = await this.analyticsService.trackBulkEvents(body.events);

      res!.status(HttpStatus.CREATED).json({
        success: true,
        data: analytics,
        count: analytics.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to track bulk analytics events',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get analytics data with filtering and pagination' })
  @ApiQuery({ name: 'eventType', required: false, description: 'Filter by event type' })
  @ApiQuery({ name: 'metricName', required: false, description: 'Filter by metric name' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'channel', required: false, description: 'Filter by channel' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority' })
  @ApiQuery({ name: 'templateId', required: false, description: 'Filter by template ID' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Filter by campaign ID' })
  @ApiQuery({ name: 'deviceType', required: false, description: 'Filter by device type' })
  @ApiQuery({ name: 'userSegment', required: false, description: 'Filter by user segment' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter by date from' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter by date to' })
  @ApiQuery({
    name: 'sortField',
    required: false,
    description: 'Sort field (timestamp, value, metricName)',
  })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics data retrieved successfully',
  })
  async getAnalytics(
    @Query('eventType') eventType?: string,
    @Query('metricName') metricName?: string,
    @Query('userId') userId?: string,
    @Query('channel') channel?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('templateId') templateId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('deviceType') deviceType?: string,
    @Query('userSegment') userSegment?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const filters = {
        eventType: eventType as any,
        metricName,
        userId,
        channel,
        category,
        priority,
        templateId,
        campaignId,
        deviceType,
        userSegment,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      const sort = {
        field: (sortField as any) || 'timestamp',
        order: (sortOrder as any) || 'desc',
      };

      const pagination = { page: page || 1, limit: limit || 10 };

      const result = await this.analyticsService.getAnalytics(filters, sort, pagination);

      res?.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get analytics data',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get aggregated metrics' })
  @ApiQuery({ name: 'eventType', required: false, description: 'Filter by event type' })
  @ApiQuery({ name: 'metricName', required: false, description: 'Filter by metric name' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'channel', required: false, description: 'Filter by channel' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter by date from' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter by date to' })
  @ApiQuery({ name: 'groupBy', required: false, description: 'Group by fields (comma-separated)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metrics retrieved successfully',
  })
  async getMetrics(
    @Query('eventType') eventType?: string,
    @Query('metricName') metricName?: string,
    @Query('userId') userId?: string,
    @Query('channel') channel?: string,
    @Query('category') category?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('groupBy') groupBy?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const filters = {
        eventType: eventType as any,
        metricName,
        userId,
        channel,
        category,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      const groupByFields = groupBy ? groupBy.split(',') : ['metricName'];

      const result = await this.analyticsService.getMetrics(filters);

      res?.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('time-series')
  @ApiOperation({ summary: 'Get time series metrics' })
  @ApiQuery({ name: 'eventType', required: false, description: 'Filter by event type' })
  @ApiQuery({ name: 'metricName', required: false, description: 'Filter by metric name' })
  @ApiQuery({ name: 'channel', required: false, description: 'Filter by channel' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter by date from' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter by date to' })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period (hourly, daily, weekly, monthly, yearly)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time series metrics retrieved successfully',
  })
  async getTimeSeriesMetrics(
    @Query('eventType') eventType?: string,
    @Query('metricName') metricName?: string,
    @Query('channel') channel?: string,
    @Query('category') category?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('period') period?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const filters = {
        eventType: eventType as any,
        metricName,
        channel,
        category,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      const aggregationPeriod = (period as AggregationPeriod) || AggregationPeriod.DAILY;

      const result = await this.analyticsService.getTimeSeriesMetrics(filters);

      res?.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get time series metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('channel-performance')
  @ApiOperation({ summary: 'Get channel performance metrics' })
  @ApiQuery({ name: 'eventType', required: false, description: 'Filter by event type' })
  @ApiQuery({ name: 'metricName', required: false, description: 'Filter by metric name' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter by date from' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter by date to' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Channel performance metrics retrieved successfully',
  })
  async getChannelPerformance(
    @Query('eventType') eventType?: string,
    @Query('metricName') metricName?: string,
    @Query('category') category?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const filters = {
        eventType: eventType as any,
        metricName,
        category,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      const result = await this.analyticsService.getChannelPerformance(filters);

      res?.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get channel performance metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('user-engagement/:userId')
  @ApiOperation({ summary: 'Get user engagement metrics' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter by date from' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter by date to' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User engagement metrics retrieved successfully',
  })
  async getUserEngagementMetrics(
    @Query('userId') userId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const result = await this.analyticsService.getUserEngagementMetrics({
        userId,
        dateFrom,
        dateTo,
      });

      res?.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get user engagement metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('notification-effectiveness')
  @ApiOperation({ summary: 'Get notification effectiveness metrics' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority' })
  @ApiQuery({ name: 'templateId', required: false, description: 'Filter by template ID' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Filter by campaign ID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter by date from' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter by date to' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification effectiveness metrics retrieved successfully',
  })
  async getNotificationEffectivenessMetrics(
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('templateId') templateId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const filters = {
        category,
        priority,
        templateId,
        campaignId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      const result = await this.analyticsService.getNotificationEffectivenessMetrics(filters);

      res?.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get notification effectiveness metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('reports')
  @ApiOperation({ summary: 'Generate analytics report' })
  @ApiBody({
    description: 'Report generation parameters',
    schema: {
      type: 'object',
      properties: {
        metricName: { type: 'string', description: 'Metric name' },
        period: {
          type: 'string',
          enum: Object.values(AggregationPeriod),
          description: 'Aggregation period',
        },
        startDate: { type: 'string', format: 'date-time', description: 'Start date' },
        endDate: { type: 'string', format: 'date-time', description: 'End date' },
        dimensions: { type: 'object', description: 'Filter dimensions' },
        groupBy: {
          type: 'array',
          items: { type: 'string' },
          description: 'Group by fields',
        },
      },
      required: ['metricName', 'period', 'startDate', 'endDate'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics report generated successfully',
  })
  async generateReport(@Body() reportDto: AnalyticsReportDto, @Res() res: Response): Promise<void> {
    try {
      const report = await this.analyticsService.generateReport(reportDto);

      res?.status(HttpStatus.OK).json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to generate analytics report',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get analytics dashboard data' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'channel', required: false, description: 'Filter by channel' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter by date from' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter by date to' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboardData(
    @Query('userId') userId?: string,
    @Query('channel') channel?: string,
    @Query('category') category?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const insightsDto: AnalyticsInsightsDto = {
        userId,
        channel,
        category,
        dateFrom: dateFrom,
        dateTo: dateTo,
      };

      const dashboard = await this.analyticsService.getDashboardData(insightsDto);

      res?.status(HttpStatus.OK).json({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get dashboard data',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('cleanup')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Cleanup old analytics data' })
  @ApiBody({
    description: 'Cleanup parameters',
    schema: {
      type: 'object',
      properties: {
        retentionDays: { type: 'number', description: 'Data retention in days', default: 90 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics data cleanup completed successfully',
  })
  async cleanupOldData(
    @Body() body: { retentionDays?: number },
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const deletedCount = await this.analyticsService.cleanupOldData(body.retentionDays || 90);

      res?.status(HttpStatus.OK).json({
        success: true,
        data: { deletedCount },
        message: `Cleaned up ${deletedCount} analytics records`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to cleanup analytics data',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
