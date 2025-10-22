import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { WebhookModule } from '../../src/modules/notification/webhook/webhook.module';
import { Webhook, WebhookDocument } from '../../src/modules/notification/webhook/webhook.schema';
import {
  WebhookDelivery,
  WebhookDeliveryDocument,
} from '../../src/modules/notification/webhook/webhook-delivery.schema';
import { StructuredLoggerService } from '../../src/infrastructure/logging/structured-logger.service';

describe('Webhook Delivery E2E Tests', () => {
  let app: INestApplication;
  let webhookModel: Model<WebhookDocument>;
  let deliveryModel: Model<WebhookDeliveryDocument>;
  let structuredLogger: StructuredLoggerService;

  const mockWebhook = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Webhook',
    description: 'Test Description',
    url: 'https://example.com/webhook',
    eventTypes: ['notification.sent', 'notification.delivered'],
    status: 'active',
    isActive: true,
    headers: { 'X-Custom': 'value' },
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 30000,
    },
    successCount: 0,
    failureCount: 0,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStructuredLogger = {
    logBusinessEvent: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WebhookModule],
    })
      .overrideProvider(StructuredLoggerService)
      .useValue(mockStructuredLogger)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    webhookModel = moduleFixture.get<Model<WebhookDocument>>(getModelToken(Webhook.name));
    deliveryModel = moduleFixture.get<Model<WebhookDeliveryDocument>>(
      getModelToken(WebhookDelivery.name),
    );
    structuredLogger = moduleFixture.get<StructuredLoggerService>(StructuredLoggerService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await webhookModel.deleteMany({});
    await deliveryModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Webhook Delivery Flow', () => {
    it('should complete full webhook delivery flow', async () => {
      // 1. Create webhook
      const webhookData = {
        name: 'Test Webhook',
        description: 'Test Description',
        url: 'https://example.com/webhook',
        eventTypes: ['notification.sent', 'notification.delivered'],
        headers: { 'X-Custom': 'value' },
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2,
          maxRetryDelay: 30000,
        },
        secret: 'secret123',
        metadata: { source: 'test' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/webhooks')
        .send(webhookData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const webhookId = createResponse.body.data._id;

      // 2. Trigger webhook delivery
      const deliveryData = {
        webhookId: webhookId,
        eventType: 'notification.sent',
        eventId: 'event123',
        payload: {
          message: 'test notification',
          userId: 'user123',
          timestamp: new Date().toISOString(),
        },
        method: 'POST',
        headers: { 'X-Custom': 'value' },
        scheduledAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        metadata: { source: 'test' },
      };

      const triggerResponse = await request(app.getHttpServer())
        .post('/api/v1/webhooks/trigger')
        .send(deliveryData)
        .expect(200);

      expect(triggerResponse.body.success).toBe(true);
      expect(triggerResponse.body.data.eventType).toBe('notification.sent');
      expect(triggerResponse.body.data.eventId).toBe('event123');
      expect(triggerResponse.body.data.status).toBe('pending');

      const deliveryId = triggerResponse.body.data._id;

      // 3. Verify delivery was created
      const deliveryResponse = await request(app.getHttpServer())
        .get(`/api/v1/webhooks/deliveries/${deliveryId}`)
        .expect(200);

      expect(deliveryResponse.body.success).toBe(true);
      expect(deliveryResponse.body.data.eventType).toBe('notification.sent');
      expect(deliveryResponse.body.data.eventId).toBe('event123');
      expect(deliveryResponse.body.data.status).toBe('pending');

      // 4. Get deliveries by webhook
      const webhookDeliveriesResponse = await request(app.getHttpServer())
        .get(`/api/v1/webhooks/deliveries/webhook/${webhookId}`)
        .expect(200);

      expect(webhookDeliveriesResponse.body.success).toBe(true);
      expect(webhookDeliveriesResponse.body.data).toHaveLength(1);
      expect(webhookDeliveriesResponse.body.data[0].eventType).toBe('notification.sent');

      // 5. Get deliveries by event ID
      const eventDeliveriesResponse = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries/event/event123')
        .expect(200);

      expect(eventDeliveriesResponse.body.success).toBe(true);
      expect(eventDeliveriesResponse.body.data).toHaveLength(1);
      expect(eventDeliveriesResponse.body.data[0].eventId).toBe('event123');

      // 6. Get webhook statistics
      const webhookStatsResponse = await request(app.getHttpServer())
        .get('/api/v1/webhooks/statistics')
        .expect(200);

      expect(webhookStatsResponse.body.success).toBe(true);
      expect(webhookStatsResponse.body.data.totalWebhooks).toBe(1);
      expect(webhookStatsResponse.body.data.activeWebhooks).toBe(1);

      // 7. Get delivery statistics
      const deliveryStatsResponse = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries/statistics')
        .expect(200);

      expect(deliveryStatsResponse.body.success).toBe(true);
      expect(deliveryStatsResponse.body.data.totalDeliveries).toBe(1);
      expect(deliveryStatsResponse.body.data.pendingDeliveries).toBe(1);
    });

    it('should handle multiple webhook deliveries', async () => {
      // Create webhook
      const webhook = await webhookModel.create(mockWebhook);

      // Create multiple deliveries
      const deliveries = await deliveryModel.create([
        {
          webhookId: (webhook as any)._id,
          eventType: 'notification.sent',
          eventId: 'event1',
          payload: { message: 'notification 1' },
          status: 'pending',
          method: 'POST',
          url: webhook.url,
          headers: webhook.headers,
          attempts: [],
          attemptCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          webhookId: (webhook as any)._id,
          eventType: 'notification.delivered',
          eventId: 'event2',
          payload: { message: 'notification 2' },
          status: 'delivered',
          method: 'POST',
          url: webhook.url,
          headers: webhook.headers,
          attempts: [
            {
              attemptNumber: 1,
              timestamp: new Date(),
              status: 'delivered',
              responseCode: 200,
              responseBody: 'OK',
              duration: 150,
            },
          ],
          attemptCount: 1,
          sentAt: new Date(),
          deliveredAt: new Date(),
          totalDuration: 150,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          webhookId: (webhook as any)._id,
          eventType: 'notification.failed',
          eventId: 'event3',
          payload: { message: 'notification 3' },
          status: 'failed',
          method: 'POST',
          url: webhook.url,
          headers: webhook.headers,
          attempts: [
            {
              attemptNumber: 1,
              timestamp: new Date(),
              status: 'failed',
              errorMessage: 'Connection timeout',
              duration: 30000,
            },
          ],
          attemptCount: 1,
          failedAt: new Date(),
          totalDuration: 30000,
          lastError: 'Connection timeout',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Get all deliveries with (pagination as any)
      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries')
        .query({ webhookId: (webhook as any)._id?.toString() || '', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deliveries).toHaveLength(3);
      expect(response.body.data.total).toBe(3);

      // Verify delivery statuses
      const deliveryStatuses = response.body.data.deliveries.map((d: any) => d.status);
      expect(deliveryStatuses).toContain('pending');
      expect(deliveryStatuses).toContain('delivered');
      expect(deliveryStatuses).toContain('failed');

      // Get delivery statistics
      const statsResponse = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries/statistics')
        .query({ webhookId: (webhook as any)._id?.toString() || '' })
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.totalDeliveries).toBe(3);
      expect(statsResponse.body.data.pendingDeliveries).toBe(1);
      expect(statsResponse.body.data.deliveredDeliveries).toBe(1);
      expect(statsResponse.body.data.failedDeliveries).toBe(1);
    });

    it('should handle webhook delivery filtering and search', async () => {
      // Create webhook
      const webhook = await webhookModel.create(mockWebhook);

      // Create deliveries with different statuses and event types
      await deliveryModel.create([
        {
          webhookId: (webhook as any)._id,
          eventType: 'notification.sent',
          eventId: 'event1',
          payload: { message: 'notification 1' },
          status: 'pending',
          method: 'POST',
          url: webhook.url,
          headers: webhook.headers,
          attempts: [],
          attemptCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          webhookId: (webhook as any)._id,
          eventType: 'notification.delivered',
          eventId: 'event2',
          payload: { message: 'notification 2' },
          status: 'delivered',
          method: 'POST',
          url: webhook.url,
          headers: webhook.headers,
          attempts: [],
          attemptCount: 1,
          sentAt: new Date(),
          deliveredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          webhookId: (webhook as any)._id,
          eventType: 'notification.failed',
          eventId: 'event3',
          payload: { message: 'notification 3' },
          status: 'failed',
          method: 'POST',
          url: webhook.url,
          headers: webhook.headers,
          attempts: [],
          attemptCount: 1,
          failedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Filter by status
      const pendingResponse = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries')
        .query({ status: 'pending' })
        .expect(200);

      expect(pendingResponse.body.success).toBe(true);
      expect(pendingResponse.body.data.deliveries).toHaveLength(1);
      expect(pendingResponse.body.data.deliveries[0].status).toBe('pending');

      // Filter by event type
      const sentResponse = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries')
        .query({ eventType: 'notification.sent' })
        .expect(200);

      expect(sentResponse.body.success).toBe(true);
      expect(sentResponse.body.data.deliveries).toHaveLength(1);
      expect(sentResponse.body.data.deliveries[0].eventType).toBe('notification.sent');

      // Filter by date range
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dateRangeResponse = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries')
        .query({
          dateFrom: yesterday.toISOString(),
          dateTo: tomorrow.toISOString(),
        })
        .expect(200);

      expect(dateRangeResponse.body.success).toBe(true);
      expect(dateRangeResponse.body.data.deliveries).toHaveLength(3);
    });

    it('should handle webhook delivery errors gracefully', async () => {
      // Test non-existent webhook
      const nonExistentResponse = await request(app.getHttpServer())
        .get('/api/v1/webhooks/507f1f77bcf86cd799439011')
        .expect(404);

      expect(nonExistentResponse.body.success).toBe(false);
      expect(nonExistentResponse.body.error).toBe('Failed to get webhook');

      // Test non-existent delivery
      const nonExistentDeliveryResponse = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries/507f1f77bcf86cd799439011')
        .expect(404);

      expect(nonExistentDeliveryResponse.body.success).toBe(false);
      expect(nonExistentDeliveryResponse.body.error).toBe('Failed to get webhook delivery');

      // Test invalid webhook data
      const invalidData = {
        name: 'Test Webhook',
        url: 'invalid-url',
        eventTypes: ['notification.sent'],
      };

      const invalidResponse = await request(app.getHttpServer())
        .post('/api/v1/webhooks')
        .send(invalidData)
        .expect(400);

      expect(invalidResponse.body.success).toBe(false);
      expect(invalidResponse.body.error).toBe('Failed to create webhook');

      // Test invalid delivery data
      const invalidDeliveryData = {
        webhookId: '507f1f77bcf86cd799439011',
        eventType: 'notification.sent',
        eventId: 'event123',
        payload: { message: 'test' },
      };

      const invalidDeliveryResponse = await request(app.getHttpServer())
        .post('/api/v1/webhooks/trigger')
        .send(invalidDeliveryData)
        .expect(404);

      expect(invalidDeliveryResponse.body.success).toBe(false);
      expect(invalidDeliveryResponse.body.error).toBe('Failed to trigger webhook');
    });
  });
});
