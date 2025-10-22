import { NotificationTemplate } from './notification-template.entity';
import { NotificationTemplateDocument } from '../../../../infrastructure/database/schemas/notification-template.schema';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';

export interface NotificationTemplateRepository {
  findById(id: string): Promise<NotificationTemplate | null>;
  findByName(name: string): Promise<NotificationTemplate | null>;
  findByTypeChannelLanguage(
    type: NotificationType,
    channel: NotificationChannel,
    language: string,
  ): Promise<NotificationTemplate | null>;
  findByTypeAndChannel(
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate[]>;
  findAll(options: {
    page?: number;
    limit?: number;
    type?: NotificationType;
    channel?: NotificationChannel;
    language?: string;
    isActive?: boolean;
    createdBy?: string;
  }): Promise<{
    templates: NotificationTemplate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  save(template: NotificationTemplate): Promise<NotificationTemplate>;
  delete(id: string): Promise<void>;
}
