export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum WebhookEventType {
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_FAILED = 'notification.failed',
  NOTIFICATION_READ = 'notification.read',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export enum DeliveryMethod {
  HTTP_POST = 'HTTP_POST',
  HTTP_PUT = 'HTTP_PUT',
  HTTP_PATCH = 'HTTP_PATCH',
}

export interface WebhookData {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  status: WebhookStatus;
  isActive: boolean;
  headers?: Record<string, string>;
  timeout: number;
  retryCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: WebhookEventType;
  payload: any;
  status: DeliveryStatus;
  method: DeliveryMethod;
  headers?: Record<string, string>;
  responseCode?: number;
  responseBody?: string;
  errorMessage?: string;
  retryCount: number;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookStatistics {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  averageResponseTime: number;
  lastTriggeredAt?: Date;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
}

export interface DeliveryStatistics {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  averageResponseTime: number;
}

export interface WebhookFilters {
  status?: WebhookStatus;
  eventType?: WebhookEventType;
  isActive?: boolean;
  createdBy?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface WebhookSortOptions {
  field: 'createdAt' | 'updatedAt' | 'lastTriggeredAt';
  order: 'asc' | 'desc';
}

export interface WebhookPaginationOptions {
  page: number;
  limit: number;
}

export interface WebhookQueryResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DeliveryFilters {
  webhookId?: string;
  eventType?: WebhookEventType;
  status?: DeliveryStatus;
  method?: DeliveryMethod;
  startDate?: Date;
  endDate?: Date;
}

export interface DeliverySortOptions {
  field: 'createdAt' | 'deliveredAt';
  order: 'asc' | 'desc';
}

export interface DeliveryPaginationOptions {
  page: number;
  limit: number;
}

export interface DeliveryQueryResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}