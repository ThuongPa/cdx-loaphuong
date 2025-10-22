import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebhookDelivery, WebhookDeliveryDocument } from './webhook-delivery.schema';

@Injectable()
export class WebhookDeliveryService {
  constructor(
    @InjectModel(WebhookDelivery.name) private deliveryModel: Model<WebhookDeliveryDocument>,
  ) {}

  async createDelivery(deliveryData: Partial<WebhookDelivery>): Promise<WebhookDeliveryDocument> {
    const delivery = new this.deliveryModel(deliveryData);
    return delivery.save();
  }

  async findById(id: string): Promise<WebhookDeliveryDocument | null> {
    return this.deliveryModel.findById(id).exec();
  }

  async findByWebhookId(webhookId: string): Promise<WebhookDeliveryDocument[]> {
    return this.deliveryModel.find({ webhookId }).exec();
  }

  async updateStatus(
    id: string,
    status: string,
    responseCode?: number,
    responseBody?: string,
  ): Promise<WebhookDeliveryDocument | null> {
    const updateData: any = { status };
    if (responseCode) updateData.responseCode = responseCode;
    if (responseBody) updateData.responseBody = responseBody;
    if (status === 'success') updateData.deliveredAt = new Date();

    return this.deliveryModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async incrementRetryCount(id: string): Promise<WebhookDeliveryDocument | null> {
    return this.deliveryModel
      .findByIdAndUpdate(id, { $inc: { retryCount: 1 } }, { new: true })
      .exec();
  }

  async processPendingDeliveries(): Promise<WebhookDeliveryDocument[]> {
    return this.deliveryModel.find({ status: 'pending' }).exec();
  }

  async retryFailedDeliveries(): Promise<WebhookDeliveryDocument[]> {
    return this.deliveryModel
      .find({
        status: 'failed',
        retryCount: { $lt: 3 },
      })
      .exec();
  }

  async cleanupExpiredDeliveries(): Promise<number> {
    const result = await this.deliveryModel
      .deleteMany({
        status: 'failed',
        retryCount: { $gte: 3 },
        createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days ago
      })
      .exec();
    return result.deletedCount || 0;
  }
}
