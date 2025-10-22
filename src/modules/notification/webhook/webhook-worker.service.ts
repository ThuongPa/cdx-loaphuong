import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookService } from './webhook.service';

@Injectable()
export class WebhookWorkerService {
  private readonly logger = new Logger(WebhookWorkerService.name);

  constructor(
    private readonly webhookDeliveryService: WebhookDeliveryService,
    private readonly webhookService: WebhookService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processPendingDeliveries() {
    try {
      this.logger.log('Processing pending webhook deliveries...');
      const pendingDeliveries = await this.webhookDeliveryService.processPendingDeliveries();

      for (const delivery of pendingDeliveries) {
        await this.processDelivery(delivery);
      }

      this.logger.log(`Processed ${pendingDeliveries.length} pending deliveries`);
    } catch (error) {
      this.logger.error('Error processing pending deliveries:', error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedDeliveries() {
    try {
      this.logger.log('Retrying failed webhook deliveries...');
      const failedDeliveries = await this.webhookDeliveryService.retryFailedDeliveries();

      for (const delivery of failedDeliveries) {
        await this.retryDelivery(delivery);
      }

      this.logger.log(`Retried ${failedDeliveries.length} failed deliveries`);
    } catch (error) {
      this.logger.error('Error retrying failed deliveries:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredDeliveries() {
    try {
      this.logger.log('Cleaning up expired webhook deliveries...');
      const deletedCount = await this.webhookDeliveryService.cleanupExpiredDeliveries();
      this.logger.log(`Cleaned up ${deletedCount} expired deliveries`);
    } catch (error) {
      this.logger.error('Error cleaning up expired deliveries:', error);
    }
  }

  private async processDelivery(delivery: any) {
    try {
      // Implementation for processing delivery
      await this.webhookDeliveryService.updateStatus(delivery._id?.toString() || '', 'in_progress');

      // Simulate webhook delivery
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await this.webhookDeliveryService.updateStatus(
        delivery._id?.toString() || '',
        'success',
        200,
        'OK',
      );
    } catch (error) {
      await this.webhookDeliveryService.updateStatus(
        delivery._id?.toString() || '',
        'failed',
        500,
        error.message,
      );
    }
  }

  private async retryDelivery(delivery: any) {
    try {
      await this.webhookDeliveryService.incrementRetryCount(delivery._id?.toString() || '');
      await this.processDelivery(delivery);
    } catch (error) {
      this.logger.error(`Error retrying delivery ${delivery._id}:`, error);
    }
  }
}
