import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { UserSyncModule } from '../../../src/modules/notification/user-sync/user-sync.module';
import {
  UserSync,
  UserSyncSchema,
  SyncBatch,
  SyncBatchSchema,
  SyncLog,
  SyncLogSchema,
  SyncStatistics,
  SyncStatisticsSchema,
  SyncConfiguration,
  SyncConfigurationSchema,
  SyncStatus,
  SyncType,
  SyncSource,
} from '../../../src/modules/notification/user-sync/user-sync.schema';
import { StructuredLoggerService } from '../../../src/infrastructure/logging/structured-logger.service';

describe('UserSync Integration Tests', () => {
  let app: INestApplication;
  let userSyncModel: Model<UserSync>;
  let syncBatchModel: Model<SyncBatch>;
  let syncLogModel: Model<SyncLog>;
  let syncStatisticsModel: Model<SyncStatistics>;
  let syncConfigurationModel: Model<SyncConfiguration>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/test-user-sync'),
        MongooseModule.forFeature([
          { name: UserSync.name, schema: UserSyncSchema },
          { name: SyncBatch.name, schema: SyncBatchSchema },
          { name: SyncLog.name, schema: SyncLogSchema },
          { name: SyncStatistics.name, schema: SyncStatisticsSchema },
          { name: SyncConfiguration.name, schema: SyncConfigurationSchema },
        ]),
        UserSyncModule,
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

    userSyncModel = moduleFixture.get<Model<UserSync>>(getModelToken(UserSync.name));
    syncBatchModel = moduleFixture.get<Model<SyncBatch>>(getModelToken(SyncBatch.name));
    syncLogModel = moduleFixture.get<Model<SyncLog>>(getModelToken(SyncLog.name));
    syncStatisticsModel = moduleFixture.get<Model<SyncStatistics>>(
      getModelToken(SyncStatistics.name),
    );
    syncConfigurationModel = moduleFixture.get<Model<SyncConfiguration>>(
      getModelToken(SyncConfiguration.name),
    );
  });

  beforeEach(async () => {
    await userSyncModel.deleteMany({});
    await syncBatchModel.deleteMany({});
    await syncLogModel.deleteMany({});
    await syncStatisticsModel.deleteMany({});
    await syncConfigurationModel.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('UserSync CRUD Operations', () => {
    it('should create a user sync', async () => {
      const createDto = {
        userId: 'user123',
        syncType: SyncType.USER_UPDATE,
        source: SyncSource.API,
        userData: {
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          preferences: {
            email: true,
            push: true,
            sms: false,
            inApp: true,
            frequency: 'immediate',
          },
        },
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        userId: createDto.userId,
        syncType: createDto.syncType,
        source: createDto.source,
        status: SyncStatus.PENDING,
      });
      expect(response.body.novuData).toBeDefined();
      expect(response.body.retryCount).toBe(0);
      expect(response.body.maxRetries).toBe(3);
    });

    it('should get user sync by ID', async () => {
      const userSync = new userSyncModel({
        userId: 'user123',
        syncType: SyncType.USER_UPDATE,
        source: SyncSource.API,
        status: SyncStatus.PENDING,
        userData: {
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        novuData: {
          subscriberId: 'user@example.com',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await userSync.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/user-sync/${userSync._id}`)
        .expect(200);

      expect(response.body._id).toBe(userSync._id?.toString() || '');
      expect(response.body.userId).toBe('user123');
    });

    it('should get user syncs by user ID', async () => {
      const userSync1 = new userSyncModel({
        userId: 'user123',
        syncType: SyncType.USER_UPDATE,
        source: SyncSource.API,
        status: SyncStatus.PENDING,
        userData: { email: 'user@example.com' },
        novuData: { subscriberId: 'user@example.com', email: 'user@example.com' },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      const userSync2 = new userSyncModel({
        userId: 'user123',
        syncType: SyncType.PREFERENCES_UPDATE,
        source: SyncSource.WEBHOOK,
        status: SyncStatus.COMPLETED,
        userData: { preferences: { email: true } },
        novuData: { preferences: { email: true } },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'webhook',
      });

      await userSync1.save();
      await userSync2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/user-sync/user/user123')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].userId).toBe('user123');
      expect(response.body[1].userId).toBe('user123');
    });

    it('should find user syncs with filters', async () => {
      const userSync1 = new userSyncModel({
        userId: 'user1',
        syncType: SyncType.USER_UPDATE,
        source: SyncSource.API,
        status: SyncStatus.PENDING,
        userData: { email: 'user1@example.com' },
        novuData: { subscriberId: 'user1@example.com', email: 'user1@example.com' },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      const userSync2 = new userSyncModel({
        userId: 'user2',
        syncType: SyncType.FULL_SYNC,
        source: SyncSource.MANUAL,
        status: SyncStatus.COMPLETED,
        userData: { email: 'user2@example.com' },
        novuData: { subscriberId: 'user2@example.com', email: 'user2@example.com' },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await userSync1.save();
      await userSync2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/user-sync')
        .query({
          syncTypes: [SyncType.USER_UPDATE],
          statuses: [SyncStatus.PENDING],
        })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].syncType).toBe(SyncType.USER_UPDATE);
      expect(response.body[0].status).toBe(SyncStatus.PENDING);
    });
  });

  describe('Sync Batch Operations', () => {
    it('should create a sync batch', async () => {
      const createDto = {
        syncType: SyncType.FULL_SYNC,
        source: SyncSource.MANUAL,
        userIds: ['user1', 'user2', 'user3'],
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync/batches')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        syncType: createDto.syncType,
        source: createDto.source,
        status: SyncStatus.PENDING,
      });
      expect(response.body.batchId).toBeDefined();
      expect(response.body.syncIds).toHaveLength(3);
      expect(response.body.summary.totalUsers).toBe(3);
    });

    it('should get sync batch by batch ID', async () => {
      const syncBatch = new syncBatchModel({
        batchId: 'batch123',
        syncType: SyncType.FULL_SYNC,
        source: SyncSource.MANUAL,
        status: SyncStatus.PENDING,
        syncIds: ['sync1', 'sync2'],
        summary: {
          totalUsers: 2,
          pendingUsers: 2,
          inProgressUsers: 0,
          completedUsers: 0,
          failedUsers: 0,
          cancelledUsers: 0,
          successRate: 0,
          averageDuration: 0,
        },
        createdBy: 'admin123',
      });

      await syncBatch.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/user-sync/batches/batch123')
        .expect(200);

      expect(response.body.batchId).toBe('batch123');
      expect(response.body.syncType).toBe(SyncType.FULL_SYNC);
    });
  });

  describe('Sync Configuration Management', () => {
    it('should create a sync configuration', async () => {
      const createDto = {
        name: 'Test Configuration',
        description: 'Test configuration description',
        settings: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          retryDelay: 1000,
          timeout: 30000,
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 10,
          },
          validation: {
            strictMode: true,
            requiredFields: ['email', 'firstName'],
            optionalFields: ['lastName', 'phone'],
          },
          mapping: {
            fieldMappings: {
              'user.email': 'subscriberId',
              'user.firstName': 'firstName',
            },
            customTransformations: {},
          },
        },
        triggers: {
          webhook: {
            enabled: true,
            url: 'https://example.com/webhook',
            secret: 'secret123',
            events: ['user.updated', 'user.created'],
          },
          schedule: {
            enabled: false,
            cron: '0 2 * * *',
            timezone: 'UTC',
          },
          api: {
            enabled: true,
            endpoints: ['/api/v1/sync'],
            authentication: {
              type: 'bearer',
              credentials: { token: 'api_token' },
            },
          },
        },
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync/configurations')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: createDto.name,
        description: createDto.description,
        isActive: true,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
      });
    });

    it('should get sync configuration by ID', async () => {
      const syncConfiguration = new syncConfigurationModel({
        name: 'Test Configuration',
        description: 'Test configuration description',
        settings: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          retryDelay: 1000,
          timeout: 30000,
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 10,
          },
          validation: {
            strictMode: true,
            requiredFields: ['email'],
            optionalFields: ['firstName'],
          },
          mapping: {
            fieldMappings: {},
            customTransformations: {},
          },
        },
        triggers: {
          webhook: {
            enabled: false,
            url: '',
            secret: '',
            events: [],
          },
          schedule: {
            enabled: false,
            cron: '',
            timezone: '',
          },
          api: {
            enabled: false,
            endpoints: [],
            authentication: {
              type: 'bearer',
              credentials: {},
            },
          },
        },
        isActive: true,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        createdBy: 'admin123',
      });

      await syncConfiguration.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/user-sync/configurations/${syncConfiguration._id}`)
        .expect(200);

      expect(response.body._id).toBe(syncConfiguration._id?.toString() || '');
      expect(response.body.name).toBe('Test Configuration');
    });

    it('should get active sync configurations', async () => {
      const config1 = new syncConfigurationModel({
        name: 'Config 1',
        settings: {
          batchSize: 100,
          concurrency: 5,
          retryAttempts: 3,
          retryDelay: 1000,
          timeout: 30000,
          rateLimit: { requestsPerMinute: 100, burstLimit: 10 },
          validation: { strictMode: true, requiredFields: [], optionalFields: [] },
          mapping: { fieldMappings: {}, customTransformations: {} },
        },
        triggers: {
          webhook: { enabled: false, url: '', secret: '', events: [] },
          schedule: { enabled: false, cron: '', timezone: '' },
          api: {
            enabled: false,
            endpoints: [],
            authentication: { type: 'bearer', credentials: {} },
          },
        },
        isActive: true,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        createdBy: 'admin123',
      });

      const config2 = new syncConfigurationModel({
        name: 'Config 2',
        settings: {
          batchSize: 50,
          concurrency: 3,
          retryAttempts: 2,
          retryDelay: 500,
          timeout: 15000,
          rateLimit: { requestsPerMinute: 50, burstLimit: 5 },
          validation: { strictMode: false, requiredFields: [], optionalFields: [] },
          mapping: { fieldMappings: {}, customTransformations: {} },
        },
        triggers: {
          webhook: { enabled: false, url: '', secret: '', events: [] },
          schedule: { enabled: false, cron: '', timezone: '' },
          api: {
            enabled: false,
            endpoints: [],
            authentication: { type: 'bearer', credentials: {} },
          },
        },
        isActive: false,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        createdBy: 'admin123',
      });

      await config1.save();
      await config2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/user-sync/configurations')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].isActive).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should get sync statistics', async () => {
      const userSync1 = new userSyncModel({
        userId: 'user1',
        syncType: SyncType.USER_UPDATE,
        source: SyncSource.API,
        status: SyncStatus.COMPLETED,
        userData: { email: 'user1@example.com' },
        novuData: { subscriberId: 'user1@example.com', email: 'user1@example.com' },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      const userSync2 = new userSyncModel({
        userId: 'user2',
        syncType: SyncType.FULL_SYNC,
        source: SyncSource.MANUAL,
        status: SyncStatus.FAILED,
        userData: { email: 'user2@example.com' },
        novuData: { subscriberId: 'user2@example.com', email: 'user2@example.com' },
        retryCount: 1,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await userSync1.save();
      await userSync2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/user-sync/statistics')
        .expect(200);

      expect(response.body).toMatchObject({
        date: expect.any(String),
        global: {
          totalSyncs: 2,
          successfulSyncs: 1,
          failedSyncs: 1,
          pendingSyncs: 0,
        },
      });
      expect(response.body.byType).toBeDefined();
      expect(response.body.bySource).toBeDefined();
      expect(response.body.performance).toBeDefined();
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk update user sync status', async () => {
      const userSync1 = new userSyncModel({
        userId: 'user1',
        syncType: SyncType.USER_UPDATE,
        source: SyncSource.API,
        status: SyncStatus.PENDING,
        userData: { email: 'user1@example.com' },
        novuData: { subscriberId: 'user1@example.com', email: 'user1@example.com' },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      const userSync2 = new userSyncModel({
        userId: 'user2',
        syncType: SyncType.FULL_SYNC,
        source: SyncSource.MANUAL,
        status: SyncStatus.PENDING,
        userData: { email: 'user2@example.com' },
        novuData: { subscriberId: 'user2@example.com', email: 'user2@example.com' },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await userSync1.save();
      await userSync2.save();

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync/bulk/update-status')
        .send({
          syncIds: [userSync1._id?.toString() || '', userSync2._id?.toString() || ''],
          status: SyncStatus.COMPLETED,
          metadata: { source: 'bulk_operation' },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        successCount: 2,
        errorCount: 0,
      });
    });
  });

  describe('Webhook Endpoints', () => {
    it('should handle user updated webhook', async () => {
      const webhookData = {
        userId: 'user123',
        userData: {
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          preferences: {
            email: true,
            push: true,
            sms: false,
            inApp: true,
            frequency: 'immediate',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync/webhooks/user-updated')
        .send(webhookData)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: webhookData.userId,
        syncType: SyncType.USER_UPDATE,
        source: SyncSource.WEBHOOK,
        status: SyncStatus.PENDING,
      });
    });

    it('should handle user deleted webhook', async () => {
      const webhookData = {
        userId: 'user123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync/webhooks/user-deleted')
        .send(webhookData)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: webhookData.userId,
        syncType: SyncType.USER_DELETE,
        source: SyncSource.WEBHOOK,
        status: SyncStatus.PENDING,
      });
    });

    it('should handle preferences updated webhook', async () => {
      const webhookData = {
        userId: 'user123',
        preferences: {
          email: true,
          push: false,
          sms: true,
          inApp: true,
          frequency: 'daily',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync/webhooks/preferences-updated')
        .send(webhookData)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: webhookData.userId,
        syncType: SyncType.PREFERENCES_UPDATE,
        source: SyncSource.WEBHOOK,
        status: SyncStatus.PENDING,
      });
    });

    it('should handle device updated webhook', async () => {
      const webhookData = {
        userId: 'user123',
        devices: [
          {
            id: 'device1',
            type: 'ios',
            token: 'device_token_123',
            isActive: true,
            lastSeen: new Date(),
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync/webhooks/device-updated')
        .send(webhookData)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: webhookData.userId,
        syncType: SyncType.DEVICE_UPDATE,
        source: SyncSource.WEBHOOK,
        status: SyncStatus.PENDING,
      });
    });
  });

  describe('Manual Sync Operations', () => {
    it('should trigger full sync', async () => {
      const syncData = {
        userIds: ['user1', 'user2', 'user3'],
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync/sync/full-sync')
        .send(syncData)
        .expect(200);

      expect(response.body).toMatchObject({
        syncType: SyncType.FULL_SYNC,
        source: SyncSource.MANUAL,
        status: SyncStatus.PENDING,
      });
      expect(response.body.batchId).toBeDefined();
      expect(response.body.syncIds).toHaveLength(3);
    });

    it('should trigger incremental sync', async () => {
      const syncData = {
        userIds: ['user1', 'user2'],
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/user-sync/sync/incremental-sync')
        .send(syncData)
        .expect(200);

      expect(response.body).toMatchObject({
        syncType: SyncType.INCREMENTAL_SYNC,
        source: SyncSource.MANUAL,
        status: SyncStatus.PENDING,
      });
      expect(response.body.batchId).toBeDefined();
      expect(response.body.syncIds).toHaveLength(2);
    });
  });
});
