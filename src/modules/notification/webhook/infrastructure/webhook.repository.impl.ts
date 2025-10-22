import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Webhook } from '../domain/webhook.entity';
import { WebhookRepository } from './webhook.repository';
import { WebhookFilters } from '../application/services/webhook.service';
import { WebhookDocument, WebhookSchema } from '../webhook.schema';

@Injectable()
export class WebhookRepositoryImpl implements WebhookRepository {
  constructor(@InjectModel('Webhook') private webhookModel: Model<WebhookDocument>) {}

  async create(webhook: Webhook): Promise<Webhook> {
    const webhookData = webhook.toPersistence();
    const created = await this.webhookModel.create(webhookData);
    return Webhook.fromPersistence(created);
  }

  async findById(id: string): Promise<Webhook | null> {
    const webhook = await this.webhookModel.findById(id).exec();
    return webhook ? Webhook.fromPersistence(webhook) : null;
  }

  async find(filters: WebhookFilters): Promise<Webhook[]> {
    const query: any = {};

    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }

    if (filters.url) {
      query.url = { $regex: filters.url, $options: 'i' };
    }

    if (filters.events && filters.events.length > 0) {
      query.events = { $in: filters.events };
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    const webhooks = await this.webhookModel
      .find(query)
      .limit(filters.limit || 100)
      .skip(filters.offset || 0)
      .sort({ createdAt: -1 })
      .exec();

    return webhooks.map((webhook) => Webhook.fromPersistence(webhook));
  }

  async update(id: string, webhook: Webhook): Promise<Webhook> {
    const webhookData = webhook.toPersistence();
    const updated = await this.webhookModel
      .findByIdAndUpdate(id, webhookData, { new: true })
      .exec();
    return updated ? Webhook.fromPersistence(updated) : webhook;
  }

  async delete(id: string): Promise<void> {
    await this.webhookModel.findByIdAndDelete(id).exec();
  }

  async findByName(name: string): Promise<Webhook | null> {
    const webhook = await this.webhookModel.findOne({ name }).exec();
    return webhook ? Webhook.fromPersistence(webhook) : null;
  }

  async findByEventType(eventType: string): Promise<Webhook[]> {
    const webhooks = await this.webhookModel
      .find({
        events: eventType,
        isActive: true,
      })
      .exec();

    return webhooks.map((webhook) => Webhook.fromPersistence(webhook));
  }

  async search(query: string): Promise<Webhook[]> {
    const webhooks = await this.webhookModel
      .find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { url: { $regex: query, $options: 'i' } },
        ],
      })
      .exec();

    return webhooks.map((webhook) => Webhook.fromPersistence(webhook));
  }

  async cleanupInactiveWebhooks(cutoffDate: Date): Promise<number> {
    const result = await this.webhookModel
      .deleteMany({
        isActive: false,
        updatedAt: { $lt: cutoffDate },
      })
      .exec();

    return result.deletedCount || 0;
  }
}
