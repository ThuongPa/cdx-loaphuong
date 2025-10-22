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
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

// Placeholder DTOs - these should be created properly
interface CreateAbTestDto {
  name: string;
  description?: string;
  testType: string;
  variations: any[];
  targetAudience: any;
  duration: any;
  successMetrics: any;
  settings?: any;
  metadata?: any;
}

interface UpdateAbTestDto {
  name?: string;
  description?: string;
  variations?: any[];
  targetAudience?: any;
  duration?: any;
  successMetrics?: any;
  settings?: any;
  metadata?: any;
}

interface EnrollParticipantDto {
  userId: string;
  testId: string;
  variationId?: string;
  metadata?: any;
}

interface RecordInteractionDto {
  userId: string;
  testId: string;
  interactionType: string;
  metadata?: any;
}

interface RecordConversionDto {
  userId: string;
  testId: string;
  metricName: string;
  value: number;
  metadata?: any;
}

// Placeholder service - this should be created properly
class AbTestService {
  async createAbTest(dto: CreateAbTestDto, createdBy: string) {
    return { id: 'test-id', ...dto };
  }

  async getAbTests(filters: any, sort: any, pagination: any) {
    return { tests: [], total: 0, page: 1, limit: 10 };
  }

  async getEligibleTests(
    userId: string,
    userSegments?: string[],
    categories?: string[],
    channels?: string[],
  ) {
    return [];
  }

  async getAbTestById(id: string) {
    return { id, name: 'Test' };
  }

  async updateAbTest(id: string, dto: UpdateAbTestDto, updatedBy: string) {
    return { id, ...dto };
  }

  async deleteAbTest(id: string) {
    return true;
  }

  async startAbTest(id: string, startedBy: string) {
    return { id, status: 'running' };
  }

  async stopAbTest(id: string, stoppedBy: string) {
    return { id, status: 'stopped' };
  }

  async getTestResults(id: string) {
    return { id, results: {} };
  }

  async getTestStatistics(id: string) {
    return { id, statistics: {} };
  }

  async enrollParticipant(dto: EnrollParticipantDto) {
    return { id: 'participant-id', ...dto };
  }

  async exposeParticipant(testId: string, userId: string) {
    return { testId, userId, exposed: true };
  }

  async recordInteraction(dto: RecordInteractionDto) {
    return { id: 'interaction-id', ...dto };
  }

  async recordConversion(dto: RecordConversionDto) {
    return { id: 'conversion-id', ...dto };
  }

  async getTestsForUser(userId: string) {
    return [];
  }

  async cleanupCompletedTests() {
    return { deletedCount: 0 };
  }
}

@ApiTags('A/B Testing')
@Controller('ab-tests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class AbTestController {
  constructor(private readonly abTestService: AbTestService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new A/B test' })
  @ApiBody({
    description: 'A/B test creation data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Test name' },
        description: { type: 'string', description: 'Test description' },
        testType: {
          type: 'string',
          enum: ['content', 'delivery', 'timing', 'channel', 'template'],
          description: 'Type of A/B test',
        },
        variations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              content: { type: 'object' },
              isControl: { type: 'boolean' },
              weight: { type: 'number' },
            },
          },
          description: 'Test variations',
        },
        targetAudience: {
          type: 'object',
          properties: {
            userSegments: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } },
            channels: { type: 'array', items: { type: 'string' } },
            userIds: { type: 'array', items: { type: 'string' } },
            criteria: { type: 'object' },
          },
          description: 'Target audience criteria',
        },
        duration: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
          description: 'Test duration',
        },
        successMetrics: {
          type: 'object',
          properties: {
            primary: { type: 'string' },
            secondary: { type: 'array', items: { type: 'string' } },
            conversionEvents: { type: 'array', items: { type: 'string' } },
          },
          description: 'Success metrics',
        },
        settings: {
          type: 'object',
          properties: {
            minSampleSize: { type: 'number' },
            maxSampleSize: { type: 'number' },
            confidenceLevel: { type: 'number' },
            significanceThreshold: { type: 'number' },
            autoStop: { type: 'boolean' },
            autoStopThreshold: { type: 'number' },
          },
          description: 'Test settings',
        },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['name', 'testType', 'variations', 'targetAudience', 'duration', 'successMetrics'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'A/B test created successfully',
  })
  async createAbTest(@Body() createDto: CreateAbTestDto, @Res() res: Response): Promise<void> {
    try {
      const test = await this.abTestService.createAbTest(createDto, 'system'); // TODO: Get from auth context

      res.status(HttpStatus.CREATED).json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Failed to create A/B test',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get A/B tests with filtering and pagination' })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by test name' })
  @ApiQuery({ name: 'testType', required: false, description: 'Filter by test type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'createdBy', required: false, description: 'Filter by creator' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date' })
  @ApiQuery({ name: 'userSegments', required: false, description: 'Filter by user segments' })
  @ApiQuery({ name: 'categories', required: false, description: 'Filter by categories' })
  @ApiQuery({ name: 'channels', required: false, description: 'Filter by channels' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in name and description',
  })
  @ApiQuery({
    name: 'sortField',
    required: false,
    description: 'Sort field (name, createdAt, startedAt, completedAt)',
  })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B tests retrieved successfully',
  })
  async getAbTests(
    @Query('name') name?: string,
    @Query('testType') testType?: string,
    @Query('status') status?: string,
    @Query('createdBy') createdBy?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userSegments') userSegments?: string,
    @Query('categories') categories?: string,
    @Query('channels') channels?: string,
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
        testType: testType as any,
        status: status as any,
        createdBy,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        userSegments: userSegments ? userSegments.split(',') : undefined,
        categories: categories ? categories.split(',') : undefined,
        channels: channels ? channels.split(',') : undefined,
        search,
      };

      const sort = {
        field: (sortField as any) || 'createdAt',
        order: (sortOrder as any) || 'desc',
      };

      const pagination = { page, limit };

      const result = await this.abTestService.getAbTests(filters, sort, pagination);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get A/B tests',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('eligible')
  @ApiOperation({ summary: 'Get eligible A/B tests for a user' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiQuery({ name: 'userSegments', required: false, description: 'User segments' })
  @ApiQuery({ name: 'categories', required: false, description: 'User categories' })
  @ApiQuery({ name: 'channels', required: false, description: 'User channels' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Eligible A/B tests retrieved successfully',
  })
  async getEligibleTests(
    @Query('userId') userId: string,
    @Query('userSegments') userSegments?: string,
    @Query('categories') categories?: string,
    @Query('channels') channels?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const tests = await this.abTestService.getEligibleTests(
        userId,
        userSegments ? userSegments.split(',') : undefined,
        categories ? categories.split(',') : undefined,
        channels ? channels.split(',') : undefined,
      );

      res!.status(HttpStatus.OK).json({
        success: true,
        data: tests,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get eligible tests',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get A/B test by ID' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test retrieved successfully',
  })
  async getAbTestById(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const test = await this.abTestService.getAbTestById(id);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to get A/B test',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update A/B test' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiBody({
    description: 'A/B test update data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        variations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              content: { type: 'object' },
              isControl: { type: 'boolean' },
              weight: { type: 'number' },
            },
          },
        },
        targetAudience: {
          type: 'object',
          properties: {
            userSegments: { type: 'array', items: { type: 'string' } },
            categories: { type: 'array', items: { type: 'string' } },
            channels: { type: 'array', items: { type: 'string' } },
            userIds: { type: 'array', items: { type: 'string' } },
            criteria: { type: 'object' },
          },
        },
        duration: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        successMetrics: {
          type: 'object',
          properties: {
            primary: { type: 'string' },
            secondary: { type: 'array', items: { type: 'string' } },
            conversionEvents: { type: 'array', items: { type: 'string' } },
          },
        },
        settings: {
          type: 'object',
          properties: {
            minSampleSize: { type: 'number' },
            maxSampleSize: { type: 'number' },
            confidenceLevel: { type: 'number' },
            significanceThreshold: { type: 'number' },
            autoStop: { type: 'boolean' },
            autoStopThreshold: { type: 'number' },
          },
        },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test updated successfully',
  })
  async updateAbTest(
    @Param('id') id: string,
    @Body() updateDto: UpdateAbTestDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const test = await this.abTestService.updateAbTest(id, updateDto, 'system'); // TODO: Get from auth context

      res!.status(HttpStatus.OK).json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to update A/B test',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete A/B test' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test deleted successfully',
  })
  async deleteAbTest(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      await this.abTestService.deleteAbTest(id);

      res!.status(HttpStatus.OK).json({
        success: true,
        message: 'A/B test deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to delete A/B test',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post(':id/start')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Start A/B test' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test started successfully',
  })
  async startAbTest(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const test = await this.abTestService.startAbTest(id, 'system'); // TODO: Get from auth context

      res!.status(HttpStatus.OK).json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to start A/B test',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post(':id/stop')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Stop A/B test' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test stopped successfully',
  })
  async stopAbTest(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const test = await this.abTestService.stopAbTest(id, 'system'); // TODO: Get from auth context

      res!.status(HttpStatus.OK).json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to stop A/B test',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get A/B test results' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test results retrieved successfully',
  })
  async getTestResults(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const results = await this.abTestService.getTestResults(id);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to get test results',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get A/B test statistics' })
  @ApiParam({ name: 'id', description: 'A/B test ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test statistics retrieved successfully',
  })
  async getTestStatistics(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const statistics = await this.abTestService.getTestStatistics(id);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to get test statistics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('enroll')
  @ApiOperation({ summary: 'Enroll participant in A/B test' })
  @ApiBody({
    description: 'Participant enrollment data',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        testId: { type: 'string', description: 'Test ID' },
        variationId: { type: 'string', description: 'Variation ID (optional)' },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['userId', 'testId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Participant enrolled successfully',
  })
  async enrollParticipant(
    @Body() enrollDto: EnrollParticipantDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const participant = await this.abTestService.enrollParticipant(enrollDto);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: participant,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to enroll participant',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('expose')
  @ApiOperation({ summary: 'Expose participant to A/B test' })
  @ApiBody({
    description: 'Participant exposure data',
    schema: {
      type: 'object',
      properties: {
        testId: { type: 'string', description: 'Test ID' },
        userId: { type: 'string', description: 'User ID' },
      },
      required: ['testId', 'userId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Participant exposed successfully',
  })
  async exposeParticipant(
    @Body() body: { testId: string; userId: string },
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const participant = await this.abTestService.exposeParticipant(body.testId, body.userId);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: participant,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to expose participant',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('interaction')
  @ApiOperation({ summary: 'Record participant interaction' })
  @ApiBody({
    description: 'Interaction data',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        testId: { type: 'string', description: 'Test ID' },
        interactionType: { type: 'string', description: 'Interaction type' },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['userId', 'testId', 'interactionType'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interaction recorded successfully',
  })
  async recordInteraction(
    @Body() interactionDto: RecordInteractionDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const participant = await this.abTestService.recordInteraction(interactionDto);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: participant,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to record interaction',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('conversion')
  @ApiOperation({ summary: 'Record participant conversion' })
  @ApiBody({
    description: 'Conversion data',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        testId: { type: 'string', description: 'Test ID' },
        metricName: { type: 'string', description: 'Metric name' },
        value: { type: 'number', description: 'Metric value' },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['userId', 'testId', 'metricName', 'value'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversion recorded successfully',
  })
  async recordConversion(
    @Body() conversionDto: RecordConversionDto,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const participant = await this.abTestService.recordConversion(conversionDto);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: participant,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to record conversion',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get A/B tests for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User A/B tests retrieved successfully',
  })
  async getTestsForUser(@Param('userId') userId: string, @Res() res: Response): Promise<void> {
    try {
      const tests = await this.abTestService.getTestsForUser(userId);

      res!.status(HttpStatus.OK).json({
        success: true,
        data: tests,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      res!.status(status).json({
        success: false,
        error: 'Failed to get user tests',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('cleanup')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Cleanup completed A/B tests' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cleanup completed successfully',
  })
  async cleanupCompletedTests(@Res() res: Response): Promise<void> {
    try {
      const deletedCount = await this.abTestService.cleanupCompletedTests();

      res!.status(HttpStatus.OK).json({
        success: true,
        data: { deletedCount },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res!.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to cleanup completed tests',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
