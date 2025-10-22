import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../../../common/guards/admin.guard';
import { AdminOnly } from '../../../../common/decorators/admin-only.decorator';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { NotificationTemplateRepository } from '../domain/notification-template.repository';
import { NotificationTemplateFactory } from '../domain/notification-template.factory';
import { TemplateRendererService } from '../domain/services/template-renderer.service';

// import { ApiResponse as ApiResponseDecorator } from '../../../../common/decorators/api-response.decorator';
import {
  TemplateResponseDto,
  TemplateListResponseDto,
  RenderedTemplateResponseDto,
} from './dto/template-response.dto';

@ApiTags('Admin - Templates')
@Controller('api/v1/admin/templates')
@UseGuards(AdminGuard)
@ApiBearerAuth()
@AdminOnly()
export class TemplatesController {
  constructor(
    @Inject('NotificationTemplateRepository')
    private readonly templateRepository: NotificationTemplateRepository,
    private readonly templateRenderer: TemplateRendererService,
    private readonly templateFactory: NotificationTemplateFactory,
    private readonly templateRendererService: TemplateRendererService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all notification templates' })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    type: TemplateListResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: NotificationType,
    description: 'Filter by notification type',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    enum: NotificationChannel,
    description: 'Filter by channel',
  })
  @ApiQuery({ name: 'language', required: false, type: String, description: 'Filter by language' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  // @ApiResponseDecorator()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel,
    @Query('language') language?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<TemplateListResponseDto> {
    const result = await this.templateRepository.findAll();

    return {
      templates: result.map((template) => this.toResponseDto(template)),
      total: result.length,
      page: 1,
      limit: 10,
      totalPages: Math.ceil(result.length / 10),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  // @ApiResponseDecorator()
  async findOne(@Param('id') id: string): Promise<TemplateResponseDto> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }
    return this.toResponseDto(template);
  }

  @Post()
  @ApiOperation({ summary: 'Create new notification template' })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid template data' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  // @ApiResponseDecorator()
  async create(
    @Body() createTemplateDto: CreateTemplateDto,
    @CurrentUser() user: any,
  ): Promise<TemplateResponseDto> {
    // Check if template name already exists
    const existingTemplate = await this.templateRepository.findByName(createTemplateDto.name);
    if (existingTemplate) {
      throw new Error('Template name already exists');
    }

    // Create template using factory
    const template = this.templateFactory.createTemplate({
      ...createTemplateDto,
      createdBy: (user as any).id,
    });

    // Save template
    const savedTemplate = await this.templateRepository.create(template);
    return this.toResponseDto(savedTemplate);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 400, description: 'Invalid template data' })
  // @ApiResponseDecorator()
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if new name conflicts with existing template
    if (updateTemplateDto.name && updateTemplateDto.name !== template.name) {
      const nameExists = await this.templateRepository.existsByName(updateTemplateDto.name);
      if (nameExists) {
        throw new Error('Template name already exists');
      }
    }

    // Update template
    const savedTemplate = await this.templateRepository.update(id, updateTemplateDto);
    return this.toResponseDto(savedTemplate);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification template (soft delete)' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  // @ApiResponseDecorator()
  async remove(@Param('id') id: string): Promise<void> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    await this.templateRepository.delete(id);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview template with sample data' })
  @ApiResponse({
    status: 200,
    description: 'Template preview generated successfully',
    type: RenderedTemplateResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  // @ApiResponseDecorator()
  async preview(
    @Param('id') id: string,
    @Body() context?: Record<string, any>,
  ): Promise<RenderedTemplateResponseDto> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    const rendered = this.templateRendererService.previewTemplate(template.body, context || {});
    return {
      subject: rendered.subject,
      body: rendered.body,
      variables: context || {},
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate template syntax' })
  @ApiResponse({
    status: 200,
    description: 'Template validation completed',
  })
  // @ApiResponseDecorator()
  async validateTemplate(@Body() templateData: CreateTemplateDto): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const template = this.templateFactory.createTemplate({
      ...templateData,
      createdBy: 'validation', // Temporary for validation
    });

    const syntaxValidation = this.templateRendererService.validateTemplateSyntax(template.body);

    return {
      isValid: syntaxValidation.isValid,
      errors: syntaxValidation.errors,
      warnings: syntaxValidation.warnings,
    };
  }

  private toResponseDto(template: any): TemplateResponseDto {
    return {
      id: (template as any).id,
      name: (template as any).name,
      type: (template as any).type,
      channel: (template as any).channel,
      subject: (template as any).subject,
      body: (template as any).body,
      language: (template as any).language,
      variables: (template as any).variables,
      isActive: (template as any).isActive,
      createdBy: (template as any).createdBy,
      createdAt: (template as any).createdAt,
      updatedAt: (template as any).updatedAt,
    };
  }
}
