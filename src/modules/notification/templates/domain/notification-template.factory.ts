import { Injectable } from '@nestjs/common';
import { NotificationTemplate } from './notification-template.schema';

@Injectable()
export class NotificationTemplateFactory {
  createTemplate(templateData: Partial<NotificationTemplate>): NotificationTemplate {
    return {
      name: templateData.name || '',
      type: templateData.type || '',
      channel: templateData.channel || '',
      subject: templateData.subject || '',
      body: templateData.body || '',
      language: templateData.language || 'en',
      variables: templateData.variables || [],
      isActive: templateData.isActive ?? true,
      createdBy: templateData.createdBy || '',
      metadata: templateData.metadata || {},
    } as NotificationTemplate;
  }
}
