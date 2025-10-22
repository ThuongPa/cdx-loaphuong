import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../../../common/dto/api-response.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { NotificationDetailDto } from './dto/notification-detail.dto';
import { GetNotificationHistoryQuery } from '../application/queries/get-notification-history.query';
import { GetNotificationQuery } from '../application/queries/get-notification.query';
import { GetUnreadCountQuery } from '../application/queries/get-unread-count.query';
import { GetUserStatisticsQuery } from '../application/queries/get-user-statistics.query';
import { MarkAsReadCommand } from '../application/commands/mark-as-read.command';
import { MarkAllAsReadCommand } from '../application/commands/mark-all-read.command';
import { BulkMarkReadCommand } from '../application/commands/bulk-mark-read.command';
import { BulkArchiveCommand } from '../application/commands/bulk-archive.command';
import { BulkIdsDto } from './dto/bulk-ids.dto';
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
  Patch,
  HttpCode,
} from '@nestjs/common';
import {
  NotificationHistoryQueryDto,
  NotificationHistoryResponseDto,
} from './dto/notification-history.dto';
import {
  MarkAsReadResponseDto,
  MarkAllAsReadResponseDto,
  UnreadCountResponseDto,
} from './dto/mark-as-read.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get notification history with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification history retrieved successfully',
    type: PaginatedResponseDto<NotificationHistoryResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getNotificationHistory(
    @Query() query: NotificationHistoryQueryDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<NotificationHistoryResponseDto>> {
    this.logger.log(`Getting notification history for user: ${userId}`);

    const queryCommand = new GetNotificationHistoryQuery();
    Object.assign(queryCommand, {
      userId,
      page: query.page,
      limit: query.limit,
      type: query.type,
      channel: query.channel,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    const result = await this.queryBus.execute(queryCommand);

    return {
      success: true,
      data: result,
      message: 'Notification history retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification detail by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification detail retrieved successfully',
    type: ApiResponseDto<NotificationDetailDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - User can only view their own notifications',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getNotificationDetail(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<NotificationDetailDto>> {
    this.logger.log(`Getting notification detail: ${notificationId} for user: ${userId}`);

    const queryCommand = new GetNotificationQuery();
    queryCommand.notificationId = notificationId;
    queryCommand.userId = userId;

    const result = await this.queryBus.execute(queryCommand);

    return {
      success: true,
      data: result,
      message: 'Notification detail retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read successfully',
    type: ApiResponseDto<MarkAsReadResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - User can only mark their own notifications as read',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<MarkAsReadResponseDto>> {
    this.logger.log(`Marking notification as read: ${notificationId} for user: ${userId}`);

    const command = new MarkAsReadCommand();
    command.notificationId = notificationId;
    command.userId = userId;

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      data: result,
      message: 'Notification marked as read successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All notifications marked as read successfully',
    type: ApiResponseDto<MarkAllAsReadResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async markAllAsRead(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<MarkAllAsReadResponseDto>> {
    this.logger.log(`Marking all notifications as read for user: ${userId}`);

    const command = new MarkAllAsReadCommand();
    command.userId = userId;

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      data: result,
      message: `${result.updatedCount} notifications marked as read successfully`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unread count retrieved successfully',
    type: ApiResponseDto<UnreadCountResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getUnreadCount(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<UnreadCountResponseDto>> {
    this.logger.log(`Getting unread count for user: ${userId}`);

    const queryCommand = new GetUnreadCountQuery();
    queryCommand.userId = userId;

    const result = await this.queryBus.execute(queryCommand);

    return {
      success: true,
      data: result,
      message: 'Unread count retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me/statistics')
  @ApiOperation({ summary: 'Get detailed user notification statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  async getMyStatistics(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ApiResponseDto<any>> {
    const query = new GetUserStatisticsQuery(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    const result = await this.queryBus.execute(query);

    return {
      success: true,
      data: result,
      message: 'Statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('bulk/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk mark notifications as read' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bulk marked as read successfully' })
  async bulkMarkAsRead(
    @Body() body: BulkIdsDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<{ updatedCount: number; readAt: string }>> {
    this.logger.log(`Bulk mark as read for user ${userId}`);

    const command = new BulkMarkReadCommand(userId, body.ids);
    const result = await this.commandBus.execute(command);

    return {
      success: true,
      data: { updatedCount: result.updatedCount, readAt: result.readAt.toISOString() },
      message: `${result.updatedCount} notifications marked as read`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('bulk/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk archive notifications' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bulk archived successfully' })
  async bulkArchive(
    @Body() body: BulkIdsDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<{ updatedCount: number }>> {
    this.logger.log(`Bulk archive for user ${userId}`);

    const command = new BulkArchiveCommand(userId, body.ids);
    const result = await this.commandBus.execute(command);

    return {
      success: true,
      data: { updatedCount: result.updatedCount },
      message: `${result.updatedCount} notifications archived`,
      timestamp: new Date().toISOString(),
    };
  }
}
