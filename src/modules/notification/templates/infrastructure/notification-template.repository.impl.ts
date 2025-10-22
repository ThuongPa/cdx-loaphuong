import { Injectable } from '@nestjs/common';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { NotificationTemplateRepository } from '../domain/notification-template.repository.interface';
import { NotificationTemplate } from '../domain/notification-template.entity';
import { Type } from 'class-transformer';
import {
  NotificationTemplateDocument,
  NotificationTemplateSchema,
} from '../../../../infrastructure/database/schemas/notification-template.schema';

@Injectable()
export class NotificationTemplateRepositoryImpl implements NotificationTemplateRepository {
  constructor(
    @InjectModel('NotificationTemplate')
    private readonly templateModel: Model<NotificationTemplateDocument>,
  ) {}

  async findById(id: string): Promise<NotificationTemplate | null> {
    const document = await this.templateModel.findById(id).exec();
    return document ? this.toDomain(document) : null;
  }

  async findByName(name: string): Promise<NotificationTemplate | null> {
    const document = await this.templateModel.findOne({ name }).exec();
    return document ? this.toDomain(document) : null;
  }

  async findByTypeChannelLanguage(
    type: NotificationType,
    channel: NotificationChannel,
    language: string,
  ): Promise<NotificationTemplate | null> {
    const document = await this.templateModel
      .findOne({
        type,
        channel,
        language,
        isActive: true,
      })
      .exec();

    return document ? this.toDomain(document) : null;
  }

  async findAll(options: {
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
  }> {
    const { page = 1, limit = 10, type, channel, language, isActive, createdBy } = options;

    const filter: any = {};
    if (type !== undefined) (filter as any).type = type;
    if (channel !== undefined) (filter as any).channel = channel;
    if (language !== undefined) (filter as any).language = language;
    if (isActive !== undefined) (filter as any).isActive = isActive;
    if (createdBy !== undefined) (filter as any).createdBy = createdBy;

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.templateModel
        .find(filter as any)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.templateModel.countDocuments(filter as any).exec(),
    ]);

    const templates = documents.map((doc) => this.toDomain(doc));

    return {
      templates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByTypeChannel(
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate[]> {
    const documents = await this.templateModel
      .find({
        type,
        channel,
        isActive: true,
      })
      .sort({ language: 1 })
      .exec();

    return documents.map((doc) => this.toDomain(doc));
  }

  async findByTypeAndChannel(
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate[]> {
    const documents = await this.templateModel
      .find({
        type,
        channel,
        isActive: true,
      })
      .sort({ language: 1 })
      .exec();

    return documents.map((doc) => this.toDomain(doc));
  }

  async save(template: NotificationTemplate): Promise<NotificationTemplate> {
    const templateData = template.toPersistence();

    const document = await this.templateModel
      .findByIdAndUpdate(
        templateData.id,
        {
          $set: {
            name: templateData.name,
            type: templateData.type,
            channel: templateData.channel,
            subject: templateData.subject,
            body: templateData.body,
            language: templateData.language,
            variables: templateData.variables,
            isActive: templateData.isActive,
            createdBy: templateData.createdBy,
            updatedAt: templateData.updatedAt,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    return this.toDomain(document);
  }

  async delete(id: string): Promise<void> {
    // Soft delete by setting isActive to false
    await this.templateModel
      .findByIdAndUpdate(id, {
        $set: { isActive: false, updatedAt: new Date() },
      })
      .exec();
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const filter: any = { name };
    if (excludeId) {
      (filter as any)._id = { $ne: excludeId };
    }

    const count = await this.templateModel.countDocuments(filter as any).exec();
    return count > 0;
  }

  async count(options: {
    type?: NotificationType;
    channel?: NotificationChannel;
    language?: string;
    isActive?: boolean;
    createdBy?: string;
  }): Promise<number> {
    const filter: any = {};
    if (options.type !== undefined) (filter as any).type = options.type;
    if (options.channel !== undefined) (filter as any).channel = options.channel;
    if (options.language !== undefined) (filter as any).language = options.language;
    if (options.isActive !== undefined) (filter as any).isActive = options.isActive;
    if (options.createdBy !== undefined) (filter as any).createdBy = options.createdBy;

    return this.templateModel.countDocuments(filter as any).exec();
  }

  private toDomain(document: NotificationTemplateDocument): NotificationTemplate {
    return NotificationTemplate.fromPersistence({
      id: document._id,
      name: document.name,
      type: document.type,
      channel: document.channel,
      subject: document.subject || '',
      body: document.body,
      language: document.language,
      variables: document.variables || [],
      isActive: document.isActive,
      createdBy: document.createdBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
