import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { WebhookModule } from '../../../src/modules/notification/webhook/webhook.module';
import { Webhook, WebhookDocument } from '../../../src/modules/notification/webhook/webhook.schema';
import {
  WebhookDelivery,
  WebhookDeliveryDocument,
} from '../../../src/modules/notification/webhook/webhook-delivery.schema';
import { StructuredLoggerService } from '../../../src/infrastructure/logging/structured-logger.service';

describe('Webhook Integration Tests', () => {
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

  const mockDelivery = {
    _id: '507f1f77bcf86cd799439012',
    webhookId: '507f1f77bcf86cd799439011',
    eventType: 'notification.sent',
    eventId: 'event123',
    payload: { message: 'test notification' },
    status: 'pending',
    method: 'POST',
    url: 'https://example.com/webhook',
    headers: { 'X-Custom': 'value' },
    attempts: [],
    attemptCount: 0,
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

  describe('Webhook CRUD Operations', () => {
    it('should create a webhook', async () => {
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

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks')
        .send(webhookData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Webhook');
      expect(response.body.data.url).toBe('https://example.com/webhook');
      expect(response.body.data.eventTypes).toEqual([
        'notification.sent',
        'notification.delivered',
      ]);
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.status).toBe('active');
    });

    it('should get webhooks with (pagination as any)', async () => {
      // Create test webhooks
      await webhookModel.create([
        { ...mockWebhook, name: 'Webhook 1' },
        { ...mockWebhook, name: 'Webhook 2' },
        { ...mockWebhook, name: 'Webhook 3' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.webhooks).toHaveLength(2);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.totalPages).toBe(2);
    });

    it('should get webhook by ID', async () => {
      const webhook = await webhookModel.create(mockWebhook);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/webhooks/${(webhook as any)._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Webhook');
      expect(response.body.data.url).toBe('https://example.com/webhook');
    });

    it('should update webhook', async () => {
      const webhook = await webhookModel.create(mockWebhook);

      const updateData = {
        name: 'Updated Webhook',
        description: 'Updated Description',
        url: 'https://updated.example.com/webhook',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/webhooks/${(webhook as any)._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Webhook');
      expect(response.body.data.description).toBe('Updated Description');
      expect(response.body.data.url).toBe('https://updated.example.com/webhook');
    });

    it('should delete webhook', async () => {
      const webhook = await webhookModel.create(mockWebhook);

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/webhooks/${(webhook as any)._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook deleted successfully');

      // Verify webhook is deleted
      const deletedWebhook = await webhookModel.findById((webhook as any)._id);
      expect(deletedWebhook).toBeNull();
    });
  });

  describe('Webhook Delivery Operations', () => {
    it('should trigger webhook delivery', async () => {
      const webhook = await webhookModel.create(mockWebhook);

      const deliveryData = {
        webhookId: (webhook as any)._id?.toString() || '',
        eventType: 'notification.sent',
        eventId: 'event123',
        payload: { message: 'test notification' },
        method: 'POST',
        headers: { 'X-Custom': 'value' },
        scheduledAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        metadata: { source: 'test' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks/trigger')
        .send(deliveryData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventType).toBe('notification.sent');
      expect(response.body.data.eventId).toBe('event123');
      expect(response.body.data.status).toBe('pending');
    });

    it('should get webhook deliveries with (pagination as any)', async () => {
      const webhook = await webhookModel.create(mockWebhook);

      // Create test deliveries
      await deliveryModel.create([
        { ...mockDelivery, webhookId: (webhook as any)._id, eventType: 'notification.sent' },
        { ...mockDelivery, webhookId: (webhook as any)._id, eventType: 'notification.delivered' },
        { ...mockDelivery, webhookId: (webhook as any)._id, eventType: 'notification.read' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries')
        .query({ webhookId: (webhook as any)._id?.toString() || '', page: 1, limit: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deliveries).toHaveLength(2);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.totalPages).toBe(2);
    });

    it('should get delivery by ID', async () => {
      const webhook = await webhookModel.create(mockWebhook);
      const delivery = await deliveryModel.create({
        ...mockDelivery,
        webhookId: (webhook as any)._id,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/webhooks/deliveries/${(delivery as any)._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventType).toBe('notification.sent');
      expect(response.body.data.eventId).toBe('event123');
      expect(response.body.data.status).toBe('pending');
    });

    it('should get deliveries by webhook ID', async () => {
      const webhook = await webhookModel.create(mockWebhook);

      // Create test deliveries
      await deliveryModel.create([
        { ...mockDelivery, webhookId: (webhook as any)._id, eventType: 'notification.sent' },
        { ...mockDelivery, webhookId: (webhook as any)._id, eventType: 'notification.delivered' },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/webhooks/deliveries/webhook/${(webhook as any)._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should get deliveries by event ID', async () => {
      const webhook = await webhookModel.create(mockWebhook);

      // Create test deliveries
      await deliveryModel.create([
        { ...mockDelivery, webhookId: (webhook as any)._id, eventId: 'event123' },
        { ...mockDelivery, webhookId: (webhook as any)._id, eventId: 'event456' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries/event/event123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].eventId).toBe('event123');
    });
  });

  describe('Webhook Statistics', () => {
    it('should get webhook statistics', async () => {
      // Create test webhooks
      await webhookModel.create([
        { ...mockWebhook, name: 'Webhook 1', successCount: 10, failureCount: 2 },
        { ...mockWebhook, name: 'Webhook 2', successCount: 15, failureCount: 1 },
        { ...mockWebhook, name: 'Webhook 3', isActive: false, successCount: 5, failureCount: 3 },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalWebhooks).toBe(3);
      expect(response.body.data.activeWebhooks).toBe(2);
      expect(response.body.data.totalSuccessCount).toBe(30);
      expect(response.body.data.totalFailureCount).toBe(6);
    });

    it('should get delivery statistics', async () => {
      const webhook = await webhookModel.create(mockWebhook);

      // Create test deliveries
      await deliveryModel.create([
        { ...mockDelivery, webhookId: (webhook as any)._id, status: 'pending' },
        { ...mockDelivery, webhookId: (webhook as any)._id, status: 'sent' },
        { ...mockDelivery, webhookId: (webhook as any)._id, status: 'delivered' },
        { ...mockDelivery, webhookId: (webhook as any)._id, status: 'delivered' },
        { ...mockDelivery, webhookId: (webhook as any)._id, status: 'failed' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalDeliveries).toBe(5);
      expect(response.body.data.pendingDeliveries).toBe(1);
      expect(response.body.data.sentDeliveries).toBe(1);
      expect(response.body.data.deliveredDeliveries).toBe(2);
      expect(response.body.data.failedDeliveries).toBe(1);
    });
  });

  describe('Webhook Filtering and Search', () => {
    it('should filter webhooks by name', async () => {
      // Create test webhooks
      await webhookModel.create([
        { ...mockWebhook, name: 'Production Webhook' },
        { ...mockWebhook, name: 'Development Webhook' },
        { ...mockWebhook, name: 'Test Webhook' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks')
        .query({ name: 'Production' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.webhooks).toHaveLength(1);
      expect(response.body.data.webhooks[0].name).toBe('Production Webhook');
    });

    it('should filter webhooks by event types', async () => {
      // Create test webhooks
      await webhookModel.create([
        { ...mockWebhook, name: 'Webhook 1', eventTypes: ['notification.sent'] },
        { ...mockWebhook, name: 'Webhook 2', eventTypes: ['notification.delivered'] },
        {
          ...mockWebhook,
          name: 'Webhook 3',
          eventTypes: ['notification.sent', 'notification.delivered'],
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks')
        .query({ eventTypes: 'notification.sent' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.webhooks).toHaveLength(2);
    });

    it('should filter webhooks by status', async () => {
      // Create test webhooks
      await webhookModel.create([
        { ...mockWebhook, name: 'Webhook 1', status: 'active' },
        { ...mockWebhook, name: 'Webhook 2', status: 'inactive' },
        { ...mockWebhook, name: 'Webhook 3', status: 'suspended' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks')
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.webhooks).toHaveLength(1);
      expect(response.body.data.webhooks[0].name).toBe('Webhook 1');
    });

    it('should search webhooks by text', async () => {
      // Create test webhooks
      await webhookModel.create([
        { ...mockWebhook, name: 'Production Webhook', description: 'Production environment' },
        { ...mockWebhook, name: 'Development Webhook', description: 'Development environment' },
        { ...mockWebhook, name: 'Test Webhook', url: 'https://test.example.com/webhook' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks')
        .query({ search: 'Production' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.webhooks).toHaveLength(1);
      expect(response.body.data.webhooks[0].name).toBe('Production Webhook');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get webhook');
    });

    it('should return 400 for invalid webhook data', async () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'invalid-url',
        eventTypes: ['notification.sent'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create webhook');
    });

    it('should return 404 for non-existent delivery', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/webhooks/deliveries/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get webhook delivery');
    });
  });
});
