import { Injectable, Inject, Get, Param } from '@nestjs/common';
import { NotificationTemplateRepository } from '../../domain/notification-template.repository';
import { TemplateRendererService } from '../../domain/services/template-renderer.service';
import { NotificationTemplate } from '../../domain/notification-template.entity';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationChannel,
} from '../../../../../common/types/notification.types';

export interface TemplateSelectionParams {
  type: NotificationType;
  channel: NotificationChannel;
  language: string;
  fallbackLanguage?: string;
}

export interface RenderedNotificationContent {
  subject?: string;
  body: string;
  templateId: string;
  templateName: string;
  language: string;
  channel: NotificationChannel;
}

@Injectable()
export class TemplateSelectionService {
  constructor(
    @Inject('NotificationTemplateRepository')
    private readonly templateRepository: NotificationTemplateRepository,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  /**
   * Select and render template for notification
   */
  async selectAndRenderTemplate(
    params: TemplateSelectionParams,
    context: Record<string, any>,
  ): Promise<RenderedNotificationContent> {
    // Try to find template with requested language
    let template = await this.templateRepository.findByTypeChannelLanguage(
      params.type,
      params.channel,
      params.language,
    );

    // Fallback to default language if not found
    if (!template && params.fallbackLanguage && params.fallbackLanguage !== params.language) {
      template = await this.templateRepository.findByTypeChannelLanguage(
        params.type,
        params.channel,
        params.fallbackLanguage,
      );
    }

    // Fallback to Vietnamese if still not found
    if (!template && params.language !== 'vi') {
      template = await this.templateRepository.findByTypeChannelLanguage(
        params.type,
        params.channel,
        'vi',
      );
    }

    // If still no template found, try to find any template for this type and channel
    if (!template) {
      const templates = await this.templateRepository.findByTypeAndChannel(
        params.type,
        params.channel,
      );

      if (templates.length > 0) {
        template = templates[0]; // Use first available template
      }
    }

    if (!template) {
      throw new Error(
        `No template found for type: ${params.type}, channel: ${params.channel}, language: ${params.language}`,
      );
    }

    // Convert document to entity for rendering
    const templateEntity = NotificationTemplate.fromPersistence({
      id: template.id,
      name: template.name,
      type: template.type as NotificationType,
      channel: template.channel as NotificationChannel,
      subject: template.subject,
      body: template.body,
      language: template.language,
      variables: template.variables,
      isActive: template.isActive,
      createdBy: template.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Render template with context
    const rendered = this.templateRenderer.renderTemplate(templateEntity, context);

    return {
      subject: rendered.subject,
      body: rendered.body,
      templateId: template.id,
      templateName: template.name,
      language: template.language,
      channel: template.channel as NotificationChannel,
    };
  }

  /**
   * Get available templates for type and channel
   */
  async getAvailableTemplates(
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<Array<{ language: string; templateId: string; templateName: string }>> {
    const templates = await this.templateRepository.findByTypeAndChannel(type, channel);

    return templates.map((template) => ({
      language: template.language,
      templateId: template.id,
      templateName: template.name,
    }));
  }

  /**
   * Check if template exists for given parameters
   */
  async hasTemplate(params: TemplateSelectionParams): Promise<boolean> {
    const template = await this.templateRepository.findByTypeChannelLanguage(
      params.type,
      params.channel,
      params.language,
    );

    return template !== null;
  }

  /**
   * Get template fallback chain
   */
  async getTemplateFallbackChain(params: TemplateSelectionParams): Promise<string[]> {
    const fallbackChain: string[] = [];

    // Add requested language
    fallbackChain.push(params.language);

    // Add fallback language if different
    if (params.fallbackLanguage && params.fallbackLanguage !== params.language) {
      fallbackChain.push(params.fallbackLanguage);
    }

    // Add Vietnamese as final fallback
    if (params.language !== 'vi' && params.fallbackLanguage !== 'vi') {
      fallbackChain.push('vi');
    }

    return fallbackChain;
  }
}
