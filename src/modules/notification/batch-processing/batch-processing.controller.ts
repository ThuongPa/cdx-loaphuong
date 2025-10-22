import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BatchProcessingService, BatchNotification } from './batch-processing.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { HttpStatus, Controller, Get, Post, Body, Res, UseGuards } from '@nestjs/common';

@ApiTags('Batch Processing')
@Controller('batch-processing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class BatchProcessingController {
  constructor(private readonly batchProcessingService: BatchProcessingService) {}

  @Post('process')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Process a batch of notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalProcessed: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
            duplicates: { type: 'number' },
            processingTime: { type: 'number' },
            batchId: { type: 'string' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async processBatch(
    @Body() body: { notifications: BatchNotification[] },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { notifications } = body;

      if (!notifications || !Array.isArray(notifications)) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Invalid request body',
          message: 'notifications must be an array',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (notifications.length === 0) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Invalid request body',
          message: 'notifications array cannot be empty',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.batchProcessingService.processBatch(notifications);

      // Update statistics
      await this.batchProcessingService.updateBatchStatistics(result);

      res.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to process batch',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('statistics')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get batch processing statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalBatches: { type: 'number' },
            totalNotifications: { type: 'number' },
            averageBatchSize: { type: 'number' },
            successRate: { type: 'number' },
            averageProcessingTime: { type: 'number' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getStatistics(@Res() res: Response): Promise<void> {
    try {
      const statistics = await this.batchProcessingService.getBatchStatistics();

      res.status(HttpStatus.OK).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve statistics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
