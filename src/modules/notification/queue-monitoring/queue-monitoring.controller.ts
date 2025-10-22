import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { QueueMonitoringService } from './queue-monitoring.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { HttpStatus, Controller, Get, Post, Param, Res, UseGuards } from '@nestjs/common';

@ApiTags('Queue Monitoring')
@Controller('queue-monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class QueueMonitoringController {
  constructor(private readonly queueMonitoringService: QueueMonitoringService) {}

  @Get('status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get status of all queues' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              queueName: { type: 'string' },
              messageCount: { type: 'number' },
              consumerCount: { type: 'number' },
              processingRate: { type: 'number' },
              averageProcessingTime: { type: 'number' },
              circuitBreakerState: { type: 'string', enum: ['closed', 'open', 'half-open'] },
              lastProcessedAt: { type: 'string', format: 'date-time' },
              errorRate: { type: 'number' },
              priority: { type: 'string', enum: ['high', 'normal', 'low'] },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getAllQueuesStatus(@Res() res: Response): Promise<void> {
    try {
      const statuses = await this.queueMonitoringService.getAllQueuesStatus();

      res.status(HttpStatus.OK).json({
        success: true,
        data: statuses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve queue status',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('status/:queueName')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get status of a specific queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            queueName: { type: 'string' },
            messageCount: { type: 'number' },
            consumerCount: { type: 'number' },
            processingRate: { type: 'number' },
            averageProcessingTime: { type: 'number' },
            circuitBreakerState: { type: 'string', enum: ['closed', 'open', 'half-open'] },
            lastProcessedAt: { type: 'string', format: 'date-time' },
            errorRate: { type: 'number' },
            priority: { type: 'string', enum: ['high', 'normal', 'low'] },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getQueueStatus(@Param('queueName') queueName: string, @Res() res: Response): Promise<void> {
    try {
      const status = await this.queueMonitoringService.getQueueStatus(queueName);

      res.status(HttpStatus.OK).json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve queue status',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('metrics')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get overall queue metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overall metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalQueues: { type: 'number' },
            totalMessages: { type: 'number' },
            totalProcessed: { type: 'number' },
            totalFailed: { type: 'number' },
            overallSuccessRate: { type: 'number' },
            averageProcessingTime: { type: 'number' },
            circuitBreakerStates: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getOverallMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.queueMonitoringService.getOverallMetrics();

      res.status(HttpStatus.OK).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve overall metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('metrics/:queueName')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get metrics for a specific queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalProcessed: { type: 'number' },
            totalFailed: { type: 'number' },
            successRate: { type: 'number' },
            averageProcessingTime: { type: 'number' },
            queueLength: { type: 'number' },
            processingRate: { type: 'number' },
            circuitBreakerState: { type: 'string', enum: ['closed', 'open', 'half-open'] },
            lastProcessedAt: { type: 'string', format: 'date-time' },
            priorityBreakdown: {
              type: 'object',
              properties: {
                high: { type: 'number' },
                normal: { type: 'number' },
                low: { type: 'number' },
              },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getQueueMetrics(
    @Param('queueName') queueName: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const metrics = await this.queueMonitoringService.getQueueMetrics(queueName);

      res.status(HttpStatus.OK).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve queue metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('circuit-breakers')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get circuit breaker states for all queues' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker states retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              state: { type: 'string', enum: ['closed', 'open', 'half-open'] },
              failureCount: { type: 'number' },
              failureThreshold: { type: 'number' },
              lastFailureTime: { type: 'string', format: 'date-time' },
              nextAttemptTime: { type: 'string', format: 'date-time' },
              successCount: { type: 'number' },
              successThreshold: { type: 'number' },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getCircuitBreakerStates(@Res() res: Response): Promise<void> {
    try {
      const states = await this.queueMonitoringService.getCircuitBreakerStates();

      res.status(HttpStatus.OK).json({
        success: true,
        data: states,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve circuit breaker states',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('circuit-breakers/:queueName/reset')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Reset circuit breaker for a specific queue' })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async resetCircuitBreaker(
    @Param('queueName') queueName: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.queueMonitoringService.resetCircuitBreaker(queueName);

      res.status(HttpStatus.OK).json({
        success: true,
        message: `Circuit breaker for queue ${queueName} has been reset`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to reset circuit breaker',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
