import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { LifecycleStage, RetentionPolicy, ArchivalStatus } from './lifecycle.schema';
import {
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
} from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { CreateLifecycleDto } from './dto/create-lifecycle.dto';
import { UpdateLifecycleDto } from './dto/update-lifecycle.dto';
import { LifecycleFilters } from './dto/lifecycle-filters.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { CreateRetentionRuleDto } from './dto/create-retention-rule.dto';

@ApiTags('Lifecycle Management')
@Controller('api/v1/lifecycle')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  // Lifecycle CRUD operations
  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new lifecycle' })
  @ApiResponse({ status: 201, description: 'Lifecycle created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createLifecycle(@Body() createDto: CreateLifecycleDto) {
    return this.lifecycleService.createLifecycle(createDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lifecycle by ID' })
  @ApiResponse({ status: 200, description: 'Lifecycle retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lifecycle not found' })
  async getLifecycleById(@Param('id') id: string) {
    return this.lifecycleService.getLifecycleById(id);
  }

  @Get('notification/:notificationId')
  @ApiOperation({ summary: 'Get lifecycle by notification ID' })
  @ApiResponse({ status: 200, description: 'Lifecycle retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lifecycle not found' })
  async getLifecycleByNotificationId(@Param('notificationId') notificationId: string) {
    return this.lifecycleService.getLifecycleByNotificationId(notificationId);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update lifecycle' })
  @ApiResponse({ status: 200, description: 'Lifecycle updated successfully' })
  @ApiResponse({ status: 404, description: 'Lifecycle not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateLifecycle(@Param('id') id: string, @Body() updateDto: UpdateLifecycleDto) {
    return this.lifecycleService.updateLifecycle(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete lifecycle' })
  @ApiResponse({ status: 200, description: 'Lifecycle deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lifecycle not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteLifecycle(@Param('id') id: string) {
    return this.lifecycleService.deleteLifecycle(id);
  }

  // Stage management
  @Put(':id/stage')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update lifecycle stage' })
  @ApiResponse({ status: 200, description: 'Stage updated successfully' })
  @ApiResponse({ status: 404, description: 'Lifecycle not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateLifecycleStage(
    @Param('id') id: string,
    @Body()
    body: {
      stage: LifecycleStage;
      metadata?: Record<string, any>;
      triggeredBy?: string;
      reason?: string;
    },
  ) {
    return this.lifecycleService.updateLifecycleStage(id, body.stage);
  }

  @Get('stage/:stage')
  @ApiOperation({ summary: 'Get lifecycles by stage' })
  @ApiResponse({ status: 200, description: 'Lifecycles retrieved successfully' })
  async getLifecyclesByStage(@Param('stage') stage: LifecycleStage) {
    return this.lifecycleService.getLifecyclesByStage(stage);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get lifecycles by user' })
  @ApiResponse({ status: 200, description: 'Lifecycles retrieved successfully' })
  async getLifecyclesByUser(@Param('userId') userId: string) {
    return this.lifecycleService.getLifecyclesByUser(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Find lifecycles with filters' })
  @ApiResponse({ status: 200, description: 'Lifecycles retrieved successfully' })
  @ApiQuery({ name: 'stages', required: false, type: [String] })
  @ApiQuery({ name: 'channels', required: false, type: [String] })
  @ApiQuery({ name: 'categories', required: false, type: [String] })
  @ApiQuery({ name: 'priorities', required: false, type: [String] })
  @ApiQuery({ name: 'userSegments', required: false, type: [String] })
  @ApiQuery({ name: 'ageDaysMin', required: false, type: Number })
  @ApiQuery({ name: 'ageDaysMax', required: false, type: Number })
  @ApiQuery({ name: 'engagementLevel', required: false, enum: ['low', 'medium', 'high'] })
  @ApiQuery({ name: 'retentionPolicy', required: false, enum: RetentionPolicy })
  @ApiQuery({ name: 'archivalStatus', required: false, enum: ArchivalStatus })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findLifecycles(@Query() filters: LifecycleFilters) {
    return this.lifecycleService.findLifecycles(filters);
  }

  // Policy management
  @Post('policies')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create lifecycle policy' })
  @ApiResponse({ status: 201, description: 'Policy created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createPolicy(@Body() createDto: CreatePolicyDto) {
    return this.lifecycleService.createPolicy(createDto);
  }

  @Get('policies/:id')
  @ApiOperation({ summary: 'Get policy by ID' })
  @ApiResponse({ status: 200, description: 'Policy retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async getPolicyById(@Param('id') id: string) {
    return this.lifecycleService.getPolicyById(id);
  }

  @Get('policies/name/:name')
  @ApiOperation({ summary: 'Get policy by name' })
  @ApiResponse({ status: 200, description: 'Policy retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async getPolicyByName(@Param('name') name: string) {
    return this.lifecycleService.getPolicyByName(name);
  }

  @Put('policies/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update policy' })
  @ApiResponse({ status: 200, description: 'Policy updated successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updatePolicy(@Param('id') id: string, @Body() updateData: any) {
    return this.lifecycleService.updatePolicy(id, updateData);
  }

  @Delete('policies/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete policy' })
  @ApiResponse({ status: 200, description: 'Policy deleted successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deletePolicy(@Param('id') id: string) {
    return this.lifecycleService.deletePolicy(id);
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get active policies' })
  @ApiResponse({ status: 200, description: 'Policies retrieved successfully' })
  async getActivePolicies() {
    return this.lifecycleService.getActivePolicies();
  }

  @Post('policies/:id/execute')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Execute policy' })
  @ApiResponse({ status: 200, description: 'Policy executed successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async executePolicy(@Param('id') id: string) {
    return this.lifecycleService.executePolicy(id);
  }

  // Retention rule management
  @Post('retention-rules')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create retention rule' })
  @ApiResponse({ status: 201, description: 'Retention rule created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createRetentionRule(@Body() createDto: CreateRetentionRuleDto) {
    return this.lifecycleService.createRetentionRule(createDto);
  }

  @Get('retention-rules/:id')
  @ApiOperation({ summary: 'Get retention rule by ID' })
  @ApiResponse({ status: 200, description: 'Retention rule retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Retention rule not found' })
  async getRetentionRuleById(@Param('id') id: string) {
    return this.lifecycleService.getRetentionRuleById(id);
  }

  @Put('retention-rules/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update retention rule' })
  @ApiResponse({ status: 200, description: 'Retention rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Retention rule not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateRetentionRule(@Param('id') id: string, @Body() updateData: any) {
    return this.lifecycleService.updateRetentionRule(id, updateData);
  }

  @Delete('retention-rules/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete retention rule' })
  @ApiResponse({ status: 200, description: 'Retention rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Retention rule not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteRetentionRule(@Param('id') id: string) {
    return this.lifecycleService.deleteRetentionRule(id);
  }

  @Get('retention-rules')
  @ApiOperation({ summary: 'Get active retention rules' })
  @ApiResponse({ status: 200, description: 'Retention rules retrieved successfully' })
  async getActiveRetentionRules() {
    return this.lifecycleService.getActiveRetentionRules();
  }

  // Statistics
  @Get('statistics')
  @ApiOperation({ summary: 'Get lifecycle statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  async getLifecycleStatistics(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;
    return this.lifecycleService.getLifecycleStatistics();
  }

  @Post('statistics/generate')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Generate daily statistics' })
  @ApiResponse({ status: 200, description: 'Statistics generated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateDailyStatistics() {
    return this.lifecycleService.generateDailyStatistics();
  }

  // Bulk operations
  @Post('bulk/update-stage')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Bulk update lifecycle stages' })
  @ApiResponse({ status: 200, description: 'Bulk update completed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async bulkUpdateLifecycleStage(
    @Body()
    body: {
      lifecycleIds: string[];
      newStage: LifecycleStage;
      metadata?: Record<string, any>;
      triggeredBy?: string;
      reason?: string;
    },
  ) {
    return this.lifecycleService.bulkUpdateLifecycleStage(
      body.lifecycleIds,
      body.newStage,
      // body.metadata,
    );
  }

  @Post('bulk/archive')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Bulk archive lifecycles' })
  @ApiResponse({ status: 200, description: 'Bulk archive completed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async bulkArchiveLifecycles(@Body() body: { lifecycleIds: string[] }) {
    return this.lifecycleService.bulkArchiveLifecycles(body.lifecycleIds);
  }

  @Post('bulk/delete')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Bulk delete lifecycles' })
  @ApiResponse({ status: 200, description: 'Bulk delete completed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async bulkDeleteLifecycles(@Body() body: { lifecycleIds: string[] }) {
    return this.lifecycleService.bulkDeleteLifecycles(body.lifecycleIds);
  }
}
