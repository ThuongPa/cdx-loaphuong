import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { LifecycleModule } from '../../../src/modules/notification/lifecycle/lifecycle.module';
import {
  NotificationLifecycle,
  NotificationLifecycleSchema,
  LifecyclePolicy,
  LifecyclePolicySchema,
  LifecycleExecution,
  LifecycleExecutionSchema,
  DataRetentionRule,
  DataRetentionRuleSchema,
  LifecycleStatistics,
  LifecycleStatisticsSchema,
  LifecycleStage,
  RetentionPolicy,
  ArchivalStatus,
} from '../../../src/modules/notification/lifecycle/lifecycle.schema';
import { StructuredLoggerService } from '../../../src/infrastructure/logging/structured-logger.service';

describe('Lifecycle Integration Tests', () => {
  let app: INestApplication;
  let lifecycleModel: Model<NotificationLifecycle>;
  let policyModel: Model<LifecyclePolicy>;
  let executionModel: Model<LifecycleExecution>;
  let retentionRuleModel: Model<DataRetentionRule>;
  let statisticsModel: Model<LifecycleStatistics>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/test-lifecycle'),
        MongooseModule.forFeature([
          { name: NotificationLifecycle.name, schema: NotificationLifecycleSchema },
          { name: LifecyclePolicy.name, schema: LifecyclePolicySchema },
          { name: LifecycleExecution.name, schema: LifecycleExecutionSchema },
          { name: DataRetentionRule.name, schema: DataRetentionRuleSchema },
          { name: LifecycleStatistics.name, schema: LifecycleStatisticsSchema },
        ]),
        LifecycleModule,
      ],
      providers: [
        {
          provide: StructuredLoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    lifecycleModel = moduleFixture.get<Model<NotificationLifecycle>>(
      getModelToken(NotificationLifecycle.name),
    );
    policyModel = moduleFixture.get<Model<LifecyclePolicy>>(getModelToken(LifecyclePolicy.name));
    executionModel = moduleFixture.get<Model<LifecycleExecution>>(
      getModelToken(LifecycleExecution.name),
    );
    retentionRuleModel = moduleFixture.get<Model<DataRetentionRule>>(
      getModelToken(DataRetentionRule.name),
    );
    statisticsModel = moduleFixture.get<Model<LifecycleStatistics>>(
      getModelToken(LifecycleStatistics.name),
    );
  });

  beforeEach(async () => {
    await lifecycleModel.deleteMany({});
    await policyModel.deleteMany({});
    await executionModel.deleteMany({});
    await retentionRuleModel.deleteMany({});
    await statisticsModel.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Lifecycle CRUD Operations', () => {
    it('should create a lifecycle', async () => {
      const createDto = {
        notificationId: 'notification123',
        userId: 'user123',
        currentStage: LifecycleStage.CREATED,
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
        },
        metadata: {
          source: 'system',
          priority: 'high',
          category: 'notification',
          channel: 'push',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/lifecycle')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        notificationId: createDto.notificationId,
        userId: createDto.userId,
        currentStage: createDto.currentStage,
        archivalStatus: ArchivalStatus.ACTIVE,
      });
      expect(response.body.stageHistory).toHaveLength(1);
      expect(response.body.analytics).toBeDefined();
    });

    it('should get lifecycle by ID', async () => {
      const lifecycle = new lifecycleModel({
        notificationId: 'notification123',
        userId: 'user123',
        currentStage: LifecycleStage.CREATED,
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'high',
          category: 'notification',
          channel: 'push',
        },
        stageHistory: [
          {
            stage: LifecycleStage.CREATED,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0,
          responseTime: 0,
          deliveryTime: 0,
        },
      });

      await lifecycle.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/lifecycle/${lifecycle._id}`)
        .expect(200);

      expect(response.body._id).toBe(lifecycle._id?.toString() || '');
      expect(response.body.notificationId).toBe('notification123');
    });

    it('should update lifecycle stage', async () => {
      const lifecycle = new lifecycleModel({
        notificationId: 'notification123',
        userId: 'user123',
        currentStage: LifecycleStage.CREATED,
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'high',
          category: 'notification',
          channel: 'push',
        },
        stageHistory: [
          {
            stage: LifecycleStage.CREATED,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0,
          responseTime: 0,
          deliveryTime: 0,
        },
      });

      await lifecycle.save();

      const response = await request(app.getHttpServer())
        .put(`/api/v1/lifecycle/${lifecycle._id}/stage`)
        .send({
          stage: LifecycleStage.SENT,
          metadata: { source: 'user_action' },
          triggeredBy: 'user123',
          reason: 'User action',
        })
        .expect(200);

      expect(response.body.currentStage).toBe(LifecycleStage.SENT);
      expect(response.body.stageHistory).toHaveLength(2);
    });

    it('should get lifecycles by stage', async () => {
      const lifecycle1 = new lifecycleModel({
        notificationId: 'notification1',
        userId: 'user123',
        currentStage: LifecycleStage.SENT,
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'high',
          category: 'notification',
          channel: 'push',
        },
        stageHistory: [
          {
            stage: LifecycleStage.SENT,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0.2,
          responseTime: 1000,
          deliveryTime: 500,
        },
      });

      const lifecycle2 = new lifecycleModel({
        notificationId: 'notification2',
        userId: 'user456',
        currentStage: LifecycleStage.SENT,
        retention: {
          policy: RetentionPolicy.SHORT_TERM,
          ttlDays: 7,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 3,
          deleteAfterDays: 7,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'medium',
          category: 'notification',
          channel: 'email',
        },
        stageHistory: [
          {
            stage: LifecycleStage.SENT,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0.3,
          responseTime: 2000,
          deliveryTime: 1000,
        },
      });

      await lifecycle1.save();
      await lifecycle2.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/lifecycle/stage/${LifecycleStage.SENT}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].currentStage).toBe(LifecycleStage.SENT);
      expect(response.body[1].currentStage).toBe(LifecycleStage.SENT);
    });
  });

  describe('Policy Management', () => {
    it('should create a lifecycle policy', async () => {
      const createDto = {
        name: 'Test Policy',
        description: 'Test policy description',
        conditions: {
          stages: [LifecycleStage.SENT, LifecycleStage.DELIVERED],
          channels: ['push', 'email'],
          ageDays: { min: 7, max: 30 },
        },
        actions: {
          type: 'archive',
          delayDays: 7,
          conditions: {
            minEngagementScore: 0.5,
            maxAgeDays: 30,
          },
        },
        schedule: {
          frequency: 'daily',
          time: '02:00',
          timezone: 'UTC',
        },
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/lifecycle/policies')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: createDto.name,
        description: createDto.description,
        isActive: true,
        executionCount: 0,
        processedCount: 0,
      });
    });

    it('should get policy by ID', async () => {
      const policy = new policyModel({
        name: 'Test Policy',
        description: 'Test policy description',
        conditions: {
          stages: [LifecycleStage.SENT],
          channels: ['push'],
        },
        actions: {
          type: 'archive',
          delayDays: 7,
        },
        schedule: {
          frequency: 'daily',
          time: '02:00',
          timezone: 'UTC',
        },
        isActive: true,
        executionCount: 0,
        processedCount: 0,
        createdBy: 'admin123',
      });

      await policy.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/lifecycle/policies/${policy._id}`)
        .expect(200);

      expect(response.body._id).toBe(policy._id?.toString() || '');
      expect(response.body.name).toBe('Test Policy');
    });

    it('should execute policy', async () => {
      const policy = new policyModel({
        name: 'Test Policy',
        description: 'Test policy description',
        conditions: {
          stages: [LifecycleStage.SENT],
          channels: ['push'],
        },
        actions: {
          type: 'archive',
          delayDays: 7,
        },
        schedule: {
          frequency: 'daily',
          time: '02:00',
          timezone: 'UTC',
        },
        isActive: true,
        executionCount: 0,
        processedCount: 0,
        createdBy: 'admin123',
      });

      await policy.save();

      const lifecycle = new lifecycleModel({
        notificationId: 'notification123',
        userId: 'user123',
        currentStage: LifecycleStage.SENT,
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'high',
          category: 'notification',
          channel: 'push',
        },
        stageHistory: [
          {
            stage: LifecycleStage.SENT,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0.2,
          responseTime: 1000,
          deliveryTime: 500,
        },
      });

      await lifecycle.save();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/lifecycle/policies/${policy._id}/execute`)
        .expect(200);

      expect(response.body).toMatchObject({
        policyId: policy._id?.toString() || '',
        summary: {
          totalProcessed: 1,
          archivedCount: 1,
          deletedCount: 0,
          anonymizedCount: 0,
          exportedCount: 0,
          retainedCount: 0,
          errorCount: 0,
        },
      });
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].status).toBe('success');
    });
  });

  describe('Retention Rule Management', () => {
    it('should create a retention rule', async () => {
      const createDto = {
        name: 'Test Retention Rule',
        description: 'Test retention rule description',
        criteria: {
          dataTypes: ['notification', 'user_data'],
          stages: [LifecycleStage.ARCHIVED],
          channels: ['push', 'email'],
          ageThreshold: 30,
          engagementThreshold: 0.5,
        },
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
          anonymizeBeforeDelete: true,
        },
        compliance: {
          gdprCompliant: true,
          ccpaCompliant: true,
          soxCompliant: false,
          auditRequired: true,
          encryptionRequired: true,
        },
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/lifecycle/retention-rules')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: createDto.name,
        description: createDto.description,
        isActive: true,
        processedCount: 0,
      });
    });

    it('should get retention rule by ID', async () => {
      const retentionRule = new retentionRuleModel({
        name: 'Test Retention Rule',
        description: 'Test retention rule description',
        criteria: {
          dataTypes: ['notification'],
          stages: [LifecycleStage.ARCHIVED],
          ageThreshold: 30,
        },
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
          anonymizeBeforeDelete: true,
        },
        compliance: {
          gdprCompliant: true,
          ccpaCompliant: true,
          soxCompliant: false,
          auditRequired: true,
          encryptionRequired: true,
        },
        isActive: true,
        processedCount: 0,
        createdBy: 'admin123',
      });

      await retentionRule.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/lifecycle/retention-rules/${retentionRule._id}`)
        .expect(200);

      expect(response.body._id).toBe(retentionRule._id?.toString() || '');
      expect(response.body.name).toBe('Test Retention Rule');
    });
  });

  describe('Statistics', () => {
    it('should get lifecycle statistics', async () => {
      const lifecycle1 = new lifecycleModel({
        notificationId: 'notification1',
        userId: 'user123',
        currentStage: LifecycleStage.SENT,
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'high',
          category: 'notification',
          channel: 'push',
        },
        stageHistory: [
          {
            stage: LifecycleStage.SENT,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0.2,
          responseTime: 1000,
          deliveryTime: 500,
        },
      });

      const lifecycle2 = new lifecycleModel({
        notificationId: 'notification2',
        userId: 'user456',
        currentStage: LifecycleStage.DELIVERED,
        retention: {
          policy: RetentionPolicy.SHORT_TERM,
          ttlDays: 7,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 3,
          deleteAfterDays: 7,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'medium',
          category: 'notification',
          channel: 'email',
        },
        stageHistory: [
          {
            stage: LifecycleStage.DELIVERED,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0.4,
          responseTime: 2000,
          deliveryTime: 1000,
        },
      });

      await lifecycle1.save();
      await lifecycle2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/lifecycle/statistics')
        .expect(200);

      expect(response.body).toMatchObject({
        date: expect.any(String),
        global: {
          totalNotifications: 2,
          activeNotifications: 2,
          archivedNotifications: 0,
          deletedNotifications: 0,
        },
      });
      expect(response.body.byStage).toBeDefined();
      expect(response.body.byRetention).toBeDefined();
      expect(response.body.byChannel).toBeDefined();
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk update lifecycle stages', async () => {
      const lifecycle1 = new lifecycleModel({
        notificationId: 'notification1',
        userId: 'user123',
        currentStage: LifecycleStage.SENT,
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'high',
          category: 'notification',
          channel: 'push',
        },
        stageHistory: [
          {
            stage: LifecycleStage.SENT,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0.2,
          responseTime: 1000,
          deliveryTime: 500,
        },
      });

      const lifecycle2 = new lifecycleModel({
        notificationId: 'notification2',
        userId: 'user456',
        currentStage: LifecycleStage.SENT,
        retention: {
          policy: RetentionPolicy.SHORT_TERM,
          ttlDays: 7,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 3,
          deleteAfterDays: 7,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'medium',
          category: 'notification',
          channel: 'email',
        },
        stageHistory: [
          {
            stage: LifecycleStage.SENT,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0.3,
          responseTime: 2000,
          deliveryTime: 1000,
        },
      });

      await lifecycle1.save();
      await lifecycle2.save();

      const response = await request(app.getHttpServer())
        .post('/api/v1/lifecycle/bulk/update-stage')
        .send({
          lifecycleIds: [lifecycle1._id?.toString() || '', lifecycle2._id?.toString() || ''],
          newStage: LifecycleStage.ARCHIVED,
          metadata: { source: 'bulk_operation' },
          triggeredBy: 'admin123',
          reason: 'Bulk archival',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        successCount: 2,
        errorCount: 0,
      });
    });

    it('should bulk archive lifecycles', async () => {
      const lifecycle1 = new lifecycleModel({
        notificationId: 'notification1',
        userId: 'user123',
        currentStage: LifecycleStage.SENT,
        retention: {
          policy: RetentionPolicy.MEDIUM_TERM,
          ttlDays: 30,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 7,
          deleteAfterDays: 30,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'high',
          category: 'notification',
          channel: 'push',
        },
        stageHistory: [
          {
            stage: LifecycleStage.SENT,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0.2,
          responseTime: 1000,
          deliveryTime: 500,
        },
      });

      const lifecycle2 = new lifecycleModel({
        notificationId: 'notification2',
        userId: 'user456',
        currentStage: LifecycleStage.SENT,
        retention: {
          policy: RetentionPolicy.SHORT_TERM,
          ttlDays: 7,
          autoArchive: true,
          autoDelete: false,
          archiveAfterDays: 3,
          deleteAfterDays: 7,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        metadata: {
          source: 'system',
          priority: 'medium',
          category: 'notification',
          channel: 'email',
        },
        stageHistory: [
          {
            stage: LifecycleStage.SENT,
            timestamp: new Date(),
            metadata: { source: 'system' },
            triggeredBy: 'system',
            reason: 'Initial creation',
          },
        ],
        archivalStatus: ArchivalStatus.ACTIVE,
        analytics: {
          engagementScore: 0.3,
          responseTime: 2000,
          deliveryTime: 1000,
        },
      });

      await lifecycle1.save();
      await lifecycle2.save();

      const response = await request(app.getHttpServer())
        .post('/api/v1/lifecycle/bulk/archive')
        .send({
          lifecycleIds: [lifecycle1._id?.toString() || '', lifecycle2._id?.toString() || ''],
        })
        .expect(200);

      expect(response.body).toMatchObject({
        successCount: 2,
        errorCount: 0,
      });
    });
  });
});
