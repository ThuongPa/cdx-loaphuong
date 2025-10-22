import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../../common/guards/admin.guard';
import { Controller, Get, Post, Delete, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { DLQService } from './dlq.service';
import { DLQStatistics } from './interfaces/dlq-statistics.interface';

export class DLQRetryRequest {
  notificationIds: string[];
}

export class DLQDeleteRequest {
  notificationIds: string[];
}

export class DLQCleanupRequest {
  daysOld: number;
}

@ApiTags('Dead Letter Queue')
@Controller('admin/dlq')
@UseGuards(JwtAuthGuard, AdminGuard)
export class DLQController {
  constructor(private readonly dlqService: DLQService) {}

  @Get()
  @ApiOperation({ summary: 'Get DLQ entries with pagination and filters' })
  @ApiResponse({ status: 200, description: 'DLQ entries retrieved successfully' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50)',
  })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({
    name: 'errorCode',
    required: false,
    type: String,
    description: 'Filter by error code',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter from date (ISO string)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'Filter to date (ISO string)',
  })
  async getDLQEntries(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('errorCode') errorCode?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const filters: any = {};

    if (userId) filters.userId = userId;
    if (errorCode) filters.errorCode = errorCode;
    if (fromDate) filters.fromDate = new Date(fromDate);
    if (toDate) filters.toDate = new Date(toDate);

    return this.dlqService.getDLQEntries(page || 1, limit || 50, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get DLQ statistics' })
  @ApiResponse({ status: 200, description: 'DLQ statistics retrieved successfully' })
  async getDLQStatistics(): Promise<DLQStatistics> {
    return this.dlqService.getDLQStatistics() as any;
  }

  @Post('retry/:notificationId')
  @ApiOperation({ summary: 'Retry a single DLQ entry' })
  @ApiResponse({ status: 200, description: 'DLQ entry retry initiated' })
  async retryDLQEntry(@Param('notificationId') notificationId: string) {
    return this.dlqService.retryDLQEntry(notificationId);
  }

  @Post('retry/bulk')
  @ApiOperation({ summary: 'Bulk retry DLQ entries' })
  @ApiResponse({ status: 200, description: 'Bulk retry completed' })
  @ApiBody({ type: DLQRetryRequest })
  async bulkRetryDLQEntries(@Body() request: DLQRetryRequest) {
    return this.dlqService.bulkRetryDLQEntries(request.notificationIds);
  }

  @Delete(':notificationId')
  @ApiOperation({ summary: 'Delete a single DLQ entry permanently' })
  @ApiResponse({ status: 200, description: 'DLQ entry deleted' })
  async deleteDLQEntry(@Param('notificationId') notificationId: string) {
    return this.dlqService.deleteDLQEntry(notificationId);
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Bulk delete DLQ entries' })
  @ApiResponse({ status: 200, description: 'Bulk delete completed' })
  @ApiBody({ type: DLQDeleteRequest })
  async bulkDeleteDLQEntries(@Body() request: DLQDeleteRequest) {
    return this.dlqService.bulkDeleteDLQEntries(request.notificationIds);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Cleanup old DLQ entries' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  @ApiBody({ type: DLQCleanupRequest })
  async cleanupOldEntries(@Body() request: DLQCleanupRequest) {
    return this.dlqService.cleanupOldEntries(request.daysOld);
  }
}
