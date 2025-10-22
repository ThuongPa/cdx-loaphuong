import { Webhook } from '../domain/webhook.entity';
import { WebhookFilters } from '../application/services/webhook.service';

export interface WebhookRepository {
  create(webhook: Webhook): Promise<Webhook>;
  findById(id: string): Promise<Webhook | null>;
  find(filters: WebhookFilters): Promise<Webhook[]>;
  update(id: string, webhook: Webhook): Promise<Webhook>;
  delete(id: string): Promise<void>;
  findByName(name: string): Promise<Webhook | null>;
  findByEventType(eventType: string): Promise<Webhook[]>;
  search(query: string): Promise<Webhook[]>;
  cleanupInactiveWebhooks(cutoffDate: Date): Promise<number>;
}
