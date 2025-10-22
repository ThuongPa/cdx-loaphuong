import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Webhook, WebhookDocument } from './webhook.schema';

@Injectable()
export class WebhookRepository {
  constructor(@InjectModel(Webhook.name) private webhookModel: Model<WebhookDocument>) {}

  async create(webhookData: Partial<Webhook>): Promise<WebhookDocument> {
    const webhook = new this.webhookModel(webhookData);
    return webhook.save();
  }

  async findById(id: string): Promise<WebhookDocument | null> {
    return this.webhookModel.findById(id).exec();
  }

  async findAll(): Promise<WebhookDocument[]> {
    return this.webhookModel.find().exec();
  }

  async update(id: string, updateData: Partial<Webhook>): Promise<WebhookDocument | null> {
    return this.webhookModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.webhookModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findByEventType(eventType: string): Promise<WebhookDocument[]> {
    return this.webhookModel
      .find({
        events: eventType,
        isActive: true,
      })
      .exec();
  }

  async findByName(name: string): Promise<WebhookDocument | null> {
    return this.webhookModel.findOne({ name }).exec();
  }

  async findMany(filters: any): Promise<WebhookDocument[]> {
    return this.webhookModel.find(filters).exec();
  }

  async updateById(id: string, updateData: Partial<Webhook>): Promise<WebhookDocument | null> {
    return this.webhookModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.webhookModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async getWebhookStatistics(): Promise<any> {
    return this.webhookModel.aggregate([
      {
        $group: {
          _id: null,
          totalWebhooks: { $sum: 1 },
          activeWebhooks: { $sum: { $cond: ['$isActive', 1, 0] } },
        },
      },
    ]);
  }

  async getDeliveryStatistics(): Promise<any> {
    // This would need to be implemented with WebhookDelivery model
    return { totalDeliveries: 0, successfulDeliveries: 0, failedDeliveries: 0 };
  }

  async cleanupExpiredDeliveries(): Promise<number> {
    // This would need to be implemented with WebhookDelivery model
    return 0;
  }

  async findActiveWebhooksByEventType(eventType: string): Promise<WebhookDocument[]> {
    return this.webhookModel
      .find({
        events: eventType,
        isActive: true,
      })
      .exec();
  }

  async updateWebhookStats(webhookId: string, stats: any): Promise<void> {
    // Implementation for updating webhook statistics
  }
}
