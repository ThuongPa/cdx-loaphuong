import { Response } from 'express';
import { MongoDBBulkService, BulkOperation } from './mongodb-bulk.service';
import { RedisOptimizationService } from './redis-optimization.service';
import { ConnectionPoolService } from './connection-pool.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import {
  HttpStatus,
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  HorizontalScalingService,
  ScalingDecision,
  ScalingConfig,
} from './horizontal-scaling.service';

@ApiTags('Performance Optimization')
@Controller('api/v1/performance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class PerformanceController {
  constructor(
    private readonly mongoDBBulkService: MongoDBBulkService,
    private readonly redisOptimizationService: RedisOptimizationService,
    private readonly connectionPoolService: ConnectionPoolService,
    private readonly horizontalScalingService: HorizontalScalingService,
  ) {}

  @Post('mongodb/bulk')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Execute MongoDB bulk operation' })
  @ApiBody({
    description: 'Bulk operation configuration',
    schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['insert', 'update', 'delete', 'upsert'] },
        collection: { type: 'string' },
        documents: { type: 'array', items: { type: 'object' } },
        filter: { type: 'object' },
        update: { type: 'object' },
        options: { type: 'object' },
      },
      required: ['operation', 'collection', 'documents'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk operation executed successfully',
  })
  async executeBulkOperation(
    @Body() operation: BulkOperation,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.mongoDBBulkService.executeBulkOperation(operation);

      res.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to execute bulk operation',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('mongodb/collections/stats')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get MongoDB collections statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collections statistics retrieved successfully',
  })
  async getCollectionsStats(@Res() res: Response): Promise<void> {
    try {
      const stats = await this.mongoDBBulkService.getAllCollectionsStats();

      res.status(HttpStatus.OK).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get collections statistics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('mongodb/collections/:collectionName/optimize')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Optimize MongoDB collection' })
  @ApiParam({ name: 'collectionName', description: 'Name of the collection to optimize' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collection optimized successfully',
  })
  async optimizeCollection(
    @Param('collectionName') collectionName: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.mongoDBBulkService.optimizeCollection(collectionName);

      res.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to optimize collection',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('redis/metrics')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get Redis performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Redis metrics retrieved successfully',
  })
  async getRedisMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.redisOptimizationService.getPerformanceMetrics();

      res.status(HttpStatus.OK).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get Redis metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('redis/optimize')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Optimize Redis configuration and memory' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Redis optimization completed successfully',
  })
  async optimizeRedis(@Res() res: Response): Promise<void> {
    try {
      const [config, memoryResult] = await Promise.all([
        this.redisOptimizationService.optimizeRedisConfiguration(),
        this.redisOptimizationService.optimizeMemoryUsage(),
      ]);

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          configuration: config,
          memoryOptimization: memoryResult,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to optimize Redis',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('redis/slow-queries')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get Redis slow queries' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Slow queries retrieved successfully',
  })
  async getSlowQueries(@Res() res: Response): Promise<void> {
    try {
      const slowQueries = await this.redisOptimizationService.getSlowQueries(20);

      res.status(HttpStatus.OK).json({
        success: true,
        data: slowQueries,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get slow queries',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('redis/slow-queries/clear')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Clear Redis slow log' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Slow log cleared successfully',
  })
  async clearSlowLog(@Res() res: Response): Promise<void> {
    try {
      await this.redisOptimizationService.clearSlowLog();

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Slow log cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to clear slow log',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('redis/recommendations')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get Redis optimization recommendations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendations retrieved successfully',
  })
  async getRedisRecommendations(@Res() res: Response): Promise<void> {
    try {
      const recommendations = await this.redisOptimizationService.getOptimizationRecommendations();

      res.status(HttpStatus.OK).json({
        success: true,
        data: recommendations,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get recommendations',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('connection-pools/stats')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get connection pools statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection pools statistics retrieved successfully',
  })
  async getConnectionPoolsStats(@Res() res: Response): Promise<void> {
    try {
      const stats = await this.connectionPoolService.getAllPoolsStats();

      res.status(HttpStatus.OK).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get connection pools statistics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('connection-pools/:poolName/health')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get connection pool health status' })
  @ApiParam({ name: 'poolName', description: 'Name of the connection pool' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pool health status retrieved successfully',
  })
  async getPoolHealth(@Param('poolName') poolName: string, @Res() res: Response): Promise<void> {
    try {
      const health = await this.connectionPoolService.getPoolHealth(poolName);

      res.status(HttpStatus.OK).json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get pool health',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put('connection-pools/:poolName/resize')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Resize connection pool' })
  @ApiParam({ name: 'poolName', description: 'Name of the connection pool' })
  @ApiBody({
    description: 'New pool size',
    schema: {
      type: 'object',
      properties: {
        size: { type: 'number', minimum: 1, maximum: 100 },
      },
      required: ['size'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pool resized successfully',
  })
  async resizePool(
    @Param('poolName') poolName: string,
    @Body('size') size: number,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.connectionPoolService.resizePool(poolName, size);

      res.status(HttpStatus.OK).json({
        success: true,
        message: `Pool ${poolName} resized to ${size} connections`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to resize pool',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('scaling/:serviceName/evaluate')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Evaluate scaling for a service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service to evaluate' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scaling evaluation completed successfully',
  })
  async evaluateScaling(
    @Param('serviceName') serviceName: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const decision = await this.horizontalScalingService.evaluateScaling(serviceName);

      res.status(HttpStatus.OK).json({
        success: true,
        data: decision,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to evaluate scaling',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('scaling/:serviceName/execute')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Execute scaling decision for a service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service to scale' })
  @ApiBody({
    description: 'Scaling decision to execute',
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['scale_up', 'scale_down', 'no_action'] },
        reason: { type: 'string' },
        currentInstances: { type: 'number' },
        targetInstances: { type: 'number' },
        confidence: { type: 'number' },
        metrics: { type: 'object' },
      },
      required: ['action', 'reason', 'currentInstances', 'targetInstances', 'confidence'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scaling executed successfully',
  })
  async executeScaling(
    @Param('serviceName') serviceName: string,
    @Body() decision: ScalingDecision,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const success = await this.horizontalScalingService.executeScaling(serviceName, decision);

      res.status(HttpStatus.OK).json({
        success,
        message: success ? 'Scaling executed successfully' : 'Scaling execution failed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to execute scaling',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('scaling/:serviceName/metrics')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get scaling metrics for a service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scaling metrics retrieved successfully',
  })
  async getScalingMetrics(
    @Param('serviceName') serviceName: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const metrics = await this.horizontalScalingService.getScalingMetrics(serviceName);

      res.status(HttpStatus.OK).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get scaling metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('scaling/:serviceName/recommendations')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get scaling recommendations for a service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scaling recommendations retrieved successfully',
  })
  async getScalingRecommendations(
    @Param('serviceName') serviceName: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const recommendations =
        await this.horizontalScalingService.getScalingRecommendations(serviceName);

      res.status(HttpStatus.OK).json({
        success: true,
        data: recommendations,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get scaling recommendations',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('scaling/history')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get scaling history' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scaling history retrieved successfully',
  })
  async getScalingHistory(@Res() res: Response): Promise<void> {
    try {
      const history = await this.horizontalScalingService.getScalingHistory();

      res.status(HttpStatus.OK).json({
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get scaling history',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put('scaling/config')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update scaling configuration' })
  @ApiBody({
    description: 'Scaling configuration updates',
    schema: {
      type: 'object',
      properties: {
        minInstances: { type: 'number', minimum: 1 },
        maxInstances: { type: 'number', minimum: 1 },
        targetCpuUsage: { type: 'number', minimum: 0, maximum: 100 },
        targetMemoryUsage: { type: 'number', minimum: 0, maximum: 100 },
        targetResponseTime: { type: 'number', minimum: 0 },
        targetQueueLength: { type: 'number', minimum: 0 },
        scaleUpThreshold: { type: 'number', minimum: 0, maximum: 100 },
        scaleDownThreshold: { type: 'number', minimum: 0, maximum: 100 },
        cooldownPeriod: { type: 'number', minimum: 0 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scaling configuration updated successfully',
  })
  async updateScalingConfig(
    @Body() config: Partial<ScalingConfig>,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.horizontalScalingService.updateScalingConfig(config);

      res.status(HttpStatus.OK).json({
        success: true,
        message: 'Scaling configuration updated successfully',
        data: this.horizontalScalingService.getScalingConfig(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to update scaling configuration',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('scaling/config')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get current scaling configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scaling configuration retrieved successfully',
  })
  async getScalingConfig(@Res() res: Response): Promise<void> {
    try {
      const config = this.horizontalScalingService.getScalingConfig();

      res.status(HttpStatus.OK).json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get scaling configuration',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
