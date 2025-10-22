import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Document, Types } from 'mongoose';
import { Type } from 'class-transformer';
import { WebhookRepository } from './webhook.repository';
import { StructuredLoggerService } from '../shared/services/structured-logger.service';
import { WebhookDocument } from './webhook.schema';
import { WebhookDeliveryDocument, WebhookDelivery } from './webhook-delivery.schema';
import { WebhookEventType, WebhookStatus, DeliveryMethod, DeliveryStatus } from './webhook.types';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookDeliveryDto } from './dto/webhook-delivery.dto';
import {
  WebhookFilters,
  WebhookSortOptions,
  WebhookPaginationOptions,
  WebhookQueryResult,
} from './dto/webhook-query.dto';
import {
  DeliveryFilters,
  DeliverySortOptions,
  DeliveryPaginationOptions,
  DeliveryQueryResult,
} from './dto/delivery-query.dto';

// Temporary interfaces until types are created
interface WebhookStatistics {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
}

interface DeliveryStatistics {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  averageResponseTime: number;
  successRate: number;
}

@Injectable()
export class WebhookService {
  constructor(
    private readonly webhookRepository: WebhookRepository,
    private readonly webhookDeliveryService: any,
    private readonly structuredLogger: StructuredLoggerService,
    private readonly logger: Logger,
  ) {}

  async createWebhook(createDto: CreateWebhookDto, createdBy: string): Promise<any> {
    this.validateUrl(createDto.url);

    const existingWebhook = await this.webhookRepository.findByName(createDto.name);
    if (existingWebhook) {
      throw new ConflictException('Webhook with this name already exists');
    }

    const webhook = await this.webhookRepository.create({
      ...createDto,
      createdBy,
      isActive: true,
      headers: createDto.headers,
    });

    this.structuredLogger.log('webhook_created', {
      webhookId: webhook._id,
      name: webhook.name,
      url: webhook.url,
      createdBy,
    });

    return webhook;
  }

  async getWebhooks(filters?: any, sort?: any, pagination?: any): Promise<any> {
    return this.webhookRepository.findMany(filters);
  }

  async getWebhookById(id: string): Promise<any> {
    const webhook = await this.webhookRepository.findById(id);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }
    return webhook;
  }

  async updateWebhook(id: string, updateDto: any, updatedBy: string): Promise<any> {
    const webhook = await this.webhookRepository.findById(id);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (updateDto.url) {
      this.validateUrl(updateDto.url);
    }

    const updatedWebhook = await this.webhookRepository.updateById(id, {
      ...updateDto,
      updatedBy,
      updatedAt: new Date(),
    });

    this.structuredLogger.log('webhook_updated', {
      webhookId: id,
      updatedBy,
      changes: updateDto,
    });

    return updatedWebhook;
  }

  async deleteWebhook(id: string): Promise<void> {
    const webhook = await this.webhookRepository.findById(id);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.webhookRepository.deleteById(id);

    this.structuredLogger.log('webhook_deleted', {
      webhookId: id,
    });
  }

  async triggerWebhook(deliveryDto: any): Promise<any> {
    const webhook = await this.webhookRepository.findById(deliveryDto.webhookId);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (!webhook.isActive) {
      throw new BadRequestException('Webhook is not active');
    }

    return this.webhookDeliveryService.createDelivery(deliveryDto);
  }

  async getDeliveries(filters?: any, sort?: any, pagination?: any): Promise<any> {
    return this.webhookDeliveryService.getDeliveries(filters, sort, pagination);
  }

  async getDeliveryById(id: string): Promise<any> {
    return this.webhookDeliveryService.getDeliveryById(id);
  }

  async updateDeliveryStatus(id: string, status: string): Promise<any> {
    return this.webhookDeliveryService.updateDeliveryStatus(id, status);
  }

  async addDeliveryAttempt(deliveryId: string, attempt: any): Promise<any> {
    return this.webhookDeliveryService.addDeliveryAttempt(deliveryId, attempt);
  }

  async getWebhookStatistics(webhookId?: string): Promise<any> {
    const stats = await this.webhookRepository.getWebhookStatistics();
    return (
      stats[0] || {
        totalWebhooks: 0,
        activeWebhooks: 0,
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        successRate: 0,
      }
    );
  }

  async getDeliveryStatistics(webhookId?: string): Promise<any> {
    const stats = await this.webhookRepository.getDeliveryStatistics();
    return (
      stats[0] || {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        successRate: 0,
        averageResponseTime: 0,
      }
    );
  }

  async cleanupExpiredDeliveries(): Promise<number> {
    const deletedCount = await this.webhookRepository.cleanupExpiredDeliveries();
    this.logger.log('Cleaned up ' + deletedCount + ' expired webhook deliveries');
    return deletedCount;
  }

  async getActiveWebhooksByEventType(eventType: any): Promise<any[]> {
    return this.webhookRepository.findActiveWebhooksByEventType(eventType);
  }

  async updateWebhookStats(
    webhookId: string,
    stats: {
      successCount?: number;
      failureCount?: number;
      lastTriggeredAt?: Date;
      lastSuccessAt?: Date;
      lastFailureAt?: Date;
    },
  ): Promise<any> {
    await this.webhookRepository.updateWebhookStats(webhookId, stats);
    return { success: true };
  }

  // Missing methods that were called by controller
  async getDeliveriesByWebhook(webhookId: string): Promise<any[]> {
    return this.webhookDeliveryService.getDeliveriesByWebhook(webhookId);
  }

  async getDeliveriesByEventId(eventId: string): Promise<any[]> {
    return this.webhookDeliveryService.getDeliveriesByEventId(eventId);
  }

  async getPendingDeliveries(limit?: number): Promise<any[]> {
    return this.webhookDeliveryService.getPendingDeliveries(limit);
  }

  async getFailedDeliveriesForRetry(limit?: number): Promise<any[]> {
    return this.webhookDeliveryService.getFailedDeliveriesForRetry(limit);
  }

  async retryDelivery(deliveryId: string): Promise<any> {
    return this.webhookDeliveryService.retryDelivery(deliveryId);
  }

  async cancelDelivery(deliveryId: string): Promise<any> {
    return this.webhookDeliveryService.cancelDelivery(deliveryId);
  }

  async getWebhookDeliveries(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookDeliveries(webhookId, filters, sort, pagination);
  }

  async getWebhookDeliveryStats(webhookId: string): Promise<any> {
    return this.webhookDeliveryService.getWebhookDeliveryStats(webhookId);
  }

  async getWebhookEvents(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookEvents(webhookId, filters, sort, pagination);
  }

  async getWebhookEventStats(webhookId: string): Promise<any> {
    return this.webhookDeliveryService.getWebhookEventStats(webhookId);
  }

  async getWebhookHealth(webhookId: string): Promise<any> {
    return this.webhookDeliveryService.getWebhookHealth(webhookId);
  }

  async getWebhookMetrics(webhookId: string, timeRange?: any): Promise<any> {
    return this.webhookDeliveryService.getWebhookMetrics(webhookId, timeRange);
  }

  async getWebhookLogs(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookLogs(webhookId, filters, sort, pagination);
  }

  async getWebhookErrors(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookErrors(webhookId, filters, sort, pagination);
  }

  async getWebhookRetries(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookRetries(webhookId, filters, sort, pagination);
  }

  async getWebhookSuccesses(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookSuccesses(webhookId, filters, sort, pagination);
  }

  async getWebhookFailures(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookFailures(webhookId, filters, sort, pagination);
  }

  async getWebhookPending(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookPending(webhookId, filters, sort, pagination);
  }

  async getWebhookDelivered(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookDelivered(webhookId, filters, sort, pagination);
  }

  async getWebhookCancelled(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookCancelled(webhookId, filters, sort, pagination);
  }

  async getWebhookExpired(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookExpired(webhookId, filters, sort, pagination);
  }

  async getWebhookTimedOut(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookTimedOut(webhookId, filters, sort, pagination);
  }

  async getWebhookRateLimited(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookRateLimited(webhookId, filters, sort, pagination);
  }

  async getWebhookUnauthorized(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookUnauthorized(webhookId, filters, sort, pagination);
  }

  async getWebhookForbidden(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookForbidden(webhookId, filters, sort, pagination);
  }

  async getWebhookNotFound(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookNotFound(webhookId, filters, sort, pagination);
  }

  async getWebhookInternalError(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookInternalError(
      webhookId,
      filters,
      sort,
      pagination,
    );
  }

  async getWebhookBadGateway(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookBadGateway(webhookId, filters, sort, pagination);
  }

  async getWebhookServiceUnavailable(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookServiceUnavailable(
      webhookId,
      filters,
      sort,
      pagination,
    );
  }

  async getWebhookGatewayTimeout(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookGatewayTimeout(
      webhookId,
      filters,
      sort,
      pagination,
    );
  }

  async getWebhookNetworkError(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookNetworkError(webhookId, filters, sort, pagination);
  }

  async getWebhookTimeout(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookTimeout(webhookId, filters, sort, pagination);
  }

  async getWebhookConnectionError(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookConnectionError(
      webhookId,
      filters,
      sort,
      pagination,
    );
  }

  async getWebhookDNSError(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookDNSError(webhookId, filters, sort, pagination);
  }

  async getWebhookSSLError(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookSSLError(webhookId, filters, sort, pagination);
  }

  async getWebhookCertificateError(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookCertificateError(
      webhookId,
      filters,
      sort,
      pagination,
    );
  }

  async getWebhookProxyError(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookProxyError(webhookId, filters, sort, pagination);
  }

  async getWebhookRedirectError(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookRedirectError(
      webhookId,
      filters,
      sort,
      pagination,
    );
  }

  async getWebhookContentError(
    webhookId: string,
    filters?: any,
    sort?: any,
    pagination?: any,
  ): Promise<any> {
    return this.webhookDeliveryService.getWebhookContentError(webhookId, filters, sort, pagination);
  }

  private validateUrl(url: string): void {
    try {
      new URL(url);
    } catch (error) {
      throw new BadRequestException('Invalid URL format: ' + url);
    }
  }
}
