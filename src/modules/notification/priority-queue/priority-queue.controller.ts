import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { HttpStatus, Controller, Get, Res, UseGuards } from '@nestjs/common';
import { PriorityQueueService } from './priority-queue.service';

@ApiTags('Priority Queue')
@Controller('api/v1/priority-queue')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class PriorityQueueController {
  constructor(private readonly priorityQueueService: PriorityQueueService) {}

  @Get('status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get worker pool status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Worker pool status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalWorkers: { type: 'number' },
            activeWorkers: { type: 'number' },
            idleWorkers: { type: 'number' },
            queueLengths: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
            processingRates: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getWorkerPoolStatus(@Res() res: Response): Promise<void> {
    try {
      const status = await this.priorityQueueService.getWorkerPoolStatus();

      res.status(HttpStatus.OK).json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve worker pool status',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
