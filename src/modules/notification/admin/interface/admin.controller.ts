import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminStatisticsService } from '../application/services/admin-statistics.service';
import { BroadcastNotificationService } from '../application/services/broadcast-notification.service';
import { FailedNotificationService } from '../application/services/failed-notification.service';
import { ManualRetryService } from '../application/services/manual-retry.service';
import { AdminGuard } from '../../../../common/guards/admin.guard';
import { RateLimitGuard } from '../../../../common/guards/rate-limit.guard';
import { AuditLogService } from '../../../../common/services/audit-log.service';
import {
  HttpStatus,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
  Req,
  HttpCode,
} from '@nestjs/common';
import {
  NotificationStatisticsResponseDto,
  NotificationStatisticsQueryDto,
} from './dto/notification-statistics.dto';
import {
  BroadcastNotificationResponseDto,
  BroadcastNotificationDto,
} from './dto/broadcast-notification.dto';
import {
  FailedNotificationResponseDto,
  FailedNotificationQueryDto,
  ManualRetryDto,
  ManualRetryResponseDto,
} from './dto/failed-notification.dto';
import {
  AdminRateLimit,
  BroadcastRateLimit,
  StatisticsRateLimit,
} from '../../../../common/decorators/rate-limit.decorator';

interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@ApiTags('Admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AdminGuard, RateLimitGuard)
@AdminRateLimit()
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminStatisticsService: AdminStatisticsService,
    private readonly broadcastNotificationService: BroadcastNotificationService,
    private readonly failedNotificationService: FailedNotificationService,
    private readonly manualRetryService: ManualRetryService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('statistics')
  @StatisticsRateLimit()
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: NotificationStatisticsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin role required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  @ApiQuery({ name: 'period', required: false, description: 'Statistics period' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for custom period' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for custom period' })
  async getStatistics(
    @Query() query: NotificationStatisticsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<NotificationStatisticsResponseDto> {
    this.logger.log('Getting notification statistics', { query });

    const statistics = await this.adminStatisticsService.getNotificationStatistics(query);

    // Log audit action
    await this.auditLogService.logAdminAction(
      'VIEW_STATISTICS',
      'statistics',
      request.user?.id || 'unknown',
      request.user?.email || 'unknown',
      request.user?.roles || [],
      request,
      { query },
    );

    return statistics;
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.CREATED)
  @BroadcastRateLimit()
  @ApiOperation({ summary: 'Create broadcast notification' })
  @ApiResponse({
    status: 201,
    description: 'Broadcast notification created successfully',
    type: BroadcastNotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin role required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  async broadcastNotification(
    @Body() broadcastDto: BroadcastNotificationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<BroadcastNotificationResponseDto> {
    this.logger.log('Creating broadcast notification', { broadcastDto });

    const result = await this.broadcastNotificationService.createBroadcast(broadcastDto);

    // Log audit action
    await this.auditLogService.logAdminAction(
      'CREATE_BROADCAST',
      'broadcast',
      request.user?.id || 'unknown',
      request.user?.email || 'unknown',
      request.user?.roles || [],
      request,
      { broadcastDto },
    );

    return result;
  }

  @Get('failed')
  @ApiOperation({ summary: 'Get failed notifications' })
  @ApiResponse({
    status: 200,
    description: 'Failed notifications retrieved successfully',
    type: FailedNotificationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin role required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getFailedNotifications(
    @Query() query: FailedNotificationQueryDto,
  ): Promise<FailedNotificationResponseDto> {
    this.logger.log('Getting failed notifications', { query });

    return await this.failedNotificationService.getFailedNotifications(query);
  }

  @Get('failed/export')
  @ApiOperation({ summary: 'Export failed notifications to CSV' })
  @ApiResponse({
    status: 200,
    description: 'CSV export generated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin role required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async exportFailedNotifications(
    @Query() query: FailedNotificationQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('Exporting failed notifications to CSV', { query });

    const csvData = await this.failedNotificationService.exportToCsv(query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="failed-notifications.csv"');
    res.send(csvData);
  }

  @Post('notifications/:id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually retry failed notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification retry initiated successfully',
    type: ManualRetryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid notification ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin role required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Not Found - Notification not found' })
  async retryNotification(
    @Param('id') notificationId: string,
    @Body() retryDto: ManualRetryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ManualRetryResponseDto> {
    this.logger.log('Manually retrying notification', { notificationId, retryDto });

    const result = await this.manualRetryService.retryNotification(notificationId, retryDto);

    // Log audit action
    await this.auditLogService.logAdminAction(
      'MANUAL_RETRY',
      'retry',
      request.user?.id || 'unknown',
      request.user?.email || 'unknown',
      request.user?.roles || [],
      request,
      { notificationId, retryDto },
    );

    return result;
  }
}
