import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationTemplate, NotificationTemplateDocument } from './notification-template.schema';

@Injectable()
export class NotificationTemplateRepository {
  constructor(
    @InjectModel(NotificationTemplate.name)
    private templateModel: Model<NotificationTemplateDocument>,
  ) {}

  async create(templateData: Partial<NotificationTemplate>): Promise<NotificationTemplateDocument> {
    const template = new this.templateModel(templateData);
    return template.save();
  }

  async findById(id: string): Promise<NotificationTemplateDocument | null> {
    return this.templateModel.findById(id).exec();
  }

  async findAll(): Promise<NotificationTemplateDocument[]> {
    return this.templateModel.find().exec();
  }

  async findByTypeAndChannel(
    type: string,
    channel: string,
  ): Promise<NotificationTemplateDocument[]> {
    return this.templateModel.find({ type, channel }).exec();
  }

  async findByTypeChannelLanguage(
    type: string,
    channel: string,
    language: string,
  ): Promise<NotificationTemplateDocument | null> {
    return this.templateModel.findOne({ type, channel, language }).exec();
  }

  async update(
    id: string,
    updateData: Partial<NotificationTemplate>,
  ): Promise<NotificationTemplateDocument | null> {
    return this.templateModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.templateModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findByName(name: string): Promise<NotificationTemplateDocument | null> {
    return this.templateModel.findOne({ name }).exec();
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.templateModel.countDocuments({ name }).exec();
    return count > 0;
  }

  async save(template: NotificationTemplateDocument): Promise<NotificationTemplateDocument> {
    return template.save();
  }
}
