import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { QueuePersistenceModule } from '../../../src/modules/notification/queue-persistence/queue-persistence.module';
import {
  QueueOperation,
  QueueOperationSchema,
  QueueSnapshot,
  QueueSnapshotSchema,
  QueueMigration,
  QueueMigrationSchema,
  QueueBackup,
  QueueBackupSchema,
  QueueRestore,
  QueueRestoreSchema,
  QueueStatistics,
  QueueStatisticsSchema,
  QueueOperationType,
  QueueStatus,
  PersistenceStrategy,
} from '../../../src/modules/notification/queue-persistence/queue-persistence.schema';
import { StructuredLoggerService } from '../../../src/infrastructure/logging/structured-logger.service';

describe('QueuePersistence Integration Tests', () => {
  let app: INestApplication;
  let queueOperationModel: Model<QueueOperation>;
  let queueSnapshotModel: Model<QueueSnapshot>;
  let queueMigrationModel: Model<QueueMigration>;
  let queueBackupModel: Model<QueueBackup>;
  let queueRestoreModel: Model<QueueRestore>;
  let queueStatisticsModel: Model<QueueStatistics>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/test-queue-persistence'),
        MongooseModule.forFeature([
          { name: QueueOperation.name, schema: QueueOperationSchema },
          { name: QueueSnapshot.name, schema: QueueSnapshotSchema },
          { name: QueueMigration.name, schema: QueueMigrationSchema },
          { name: QueueBackup.name, schema: QueueBackupSchema },
          { name: QueueRestore.name, schema: QueueRestoreSchema },
          { name: QueueStatistics.name, schema: QueueStatisticsSchema },
        ]),
        QueuePersistenceModule,
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

    queueOperationModel = moduleFixture.get<Model<QueueOperation>>(
      getModelToken(QueueOperation.name),
    );
    queueSnapshotModel = moduleFixture.get<Model<QueueSnapshot>>(getModelToken(QueueSnapshot.name));
    queueMigrationModel = moduleFixture.get<Model<QueueMigration>>(
      getModelToken(QueueMigration.name),
    );
    queueBackupModel = moduleFixture.get<Model<QueueBackup>>(getModelToken(QueueBackup.name));
    queueRestoreModel = moduleFixture.get<Model<QueueRestore>>(getModelToken(QueueRestore.name));
    queueStatisticsModel = moduleFixture.get<Model<QueueStatistics>>(
      getModelToken(QueueStatistics.name),
    );
  });

  beforeEach(async () => {
    await queueOperationModel.deleteMany({});
    await queueSnapshotModel.deleteMany({});
    await queueMigrationModel.deleteMany({});
    await queueBackupModel.deleteMany({});
    await queueRestoreModel.deleteMany({});
    await queueStatisticsModel.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('QueueOperation CRUD Operations', () => {
    it('should create a queue operation', async () => {
      const createDto = {
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        payload: {
          data: { message: 'test message' },
          priority: 1,
          delay: 0,
          ttl: 3600,
        },
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/operations')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        operationType: createDto.operationType,
        queueName: createDto.queueName,
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.operationId).toBeDefined();
      expect(response.body.retryCount).toBe(0);
      expect(response.body.maxRetries).toBe(3);
    });

    it('should get queue operation by ID', async () => {
      const queueOperation = new queueOperationModel({
        operationId: 'op_123456789_abcdef',
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: {
          data: { message: 'test message' },
          priority: 1,
        },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await queueOperation.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/queue-persistence/operations/${queueOperation._id}`)
        .expect(200);

      expect(response.body._id).toBe(queueOperation._id?.toString() || '');
      expect(response.body.operationType).toBe(QueueOperationType.ENQUEUE);
    });

    it('should get queue operation by operation ID', async () => {
      const queueOperation = new queueOperationModel({
        operationId: 'op_123456789_abcdef',
        operationType: QueueOperationType.DEQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: {
          data: { message: 'test message' },
        },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await queueOperation.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/queue-persistence/operations/operation/${queueOperation.operationId}`)
        .expect(200);

      expect(response.body.operationId).toBe(queueOperation.operationId);
      expect(response.body.operationType).toBe(QueueOperationType.DEQUEUE);
    });

    it('should find queue operations with filters', async () => {
      const operation1 = new queueOperationModel({
        operationId: 'op_123456789_abcdef',
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: { data: { message: 'test message 1' } },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      const operation2 = new queueOperationModel({
        operationId: 'op_987654321_fedcba',
        operationType: QueueOperationType.DEQUEUE,
        queueName: 'other-queue',
        status: QueueStatus.ERROR,
        payload: { data: { message: 'test message 2' } },
        retryCount: 1,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await operation1.save();
      await operation2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/queue-persistence/operations')
        .query({
          operationTypes: [QueueOperationType.ENQUEUE],
          statuses: [QueueStatus.ACTIVE],
        })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].operationType).toBe(QueueOperationType.ENQUEUE);
      expect(response.body[0].status).toBe(QueueStatus.ACTIVE);
    });
  });

  describe('Queue Operation Execution', () => {
    it('should execute queue operation', async () => {
      const queueOperation = new queueOperationModel({
        operationId: 'op_123456789_abcdef',
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: {
          data: { message: 'test message' },
          priority: 1,
        },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await queueOperation.save();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/queue-persistence/operations/${queueOperation._id}/execute`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe(QueueStatus.ACTIVE);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.success).toBe(true);
    });
  });

  describe('QueueSnapshot Management', () => {
    it('should create a queue snapshot', async () => {
      const createDto = {
        queueName: 'test-queue',
        persistenceStrategy: PersistenceStrategy.REDIS_PERSISTENT,
        version: '1.0.0',
        description: 'Test snapshot',
        tags: ['test', 'snapshot'],
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/snapshots')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        queueName: createDto.queueName,
        persistenceStrategy: createDto.persistenceStrategy,
        version: createDto.version,
      });
      expect(response.body.snapshotId).toBeDefined();
      expect(response.body.snapshot).toBeDefined();
    });

    it('should get queue snapshot by ID', async () => {
      const queueSnapshot = new queueSnapshotModel({
        snapshotId: 'snapshot_123456789_abcdef',
        queueName: 'test-queue',
        persistenceStrategy: PersistenceStrategy.REDIS_PERSISTENT,
        version: '1.0.0',
        snapshot: {
          totalItems: 100,
          pendingItems: 50,
          processingItems: 20,
          completedItems: 25,
          failedItems: 5,
          pausedItems: 0,
          items: [],
          configuration: {
            maxSize: 1000,
            concurrency: 5,
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 30000,
          },
          statistics: {
            averageProcessingTime: 150,
            successRate: 0.95,
            errorRate: 0.05,
            throughput: 100,
          },
        },
        createdBy: 'admin123',
      });

      await queueSnapshot.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/queue-persistence/snapshots/${queueSnapshot._id}`)
        .expect(200);

      expect(response.body._id).toBe(queueSnapshot._id?.toString() || '');
      expect(response.body.queueName).toBe('test-queue');
    });

    it('should get queue snapshots by queue name', async () => {
      const snapshot1 = new queueSnapshotModel({
        snapshotId: 'snapshot_123456789_abcdef',
        queueName: 'test-queue',
        persistenceStrategy: PersistenceStrategy.REDIS_PERSISTENT,
        version: '1.0.0',
        snapshot: {
          totalItems: 100,
          pendingItems: 50,
          processingItems: 20,
          completedItems: 25,
          failedItems: 5,
          pausedItems: 0,
          items: [],
          configuration: {},
          statistics: {},
        },
        createdBy: 'admin123',
      });

      const snapshot2 = new queueSnapshotModel({
        snapshotId: 'snapshot_987654321_fedcba',
        queueName: 'other-queue',
        persistenceStrategy: PersistenceStrategy.MEMORY_ONLY,
        version: '1.1.0',
        snapshot: {
          totalItems: 50,
          pendingItems: 25,
          processingItems: 10,
          completedItems: 12,
          failedItems: 3,
          pausedItems: 0,
          items: [],
          configuration: {},
          statistics: {},
        },
        createdBy: 'admin123',
      });

      await snapshot1.save();
      await snapshot2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/queue-persistence/snapshots/queue/test-queue')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].queueName).toBe('test-queue');
    });
  });

  describe('QueueMigration Management', () => {
    it('should create a queue migration', async () => {
      const createDto = {
        queueName: 'test-queue',
        source: {
          type: 'redis',
          connection: { host: 'localhost', port: 6379 },
          configuration: { db: 0 },
        },
        target: {
          type: 'redis',
          connection: { host: 'localhost', port: 6380 },
          configuration: { db: 1 },
        },
        mapping: {
          fieldMappings: { old_field: 'new_field' },
          transformations: { transform: 'function' },
          filters: { status: 'active' },
        },
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/migrations')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        queueName: createDto.queueName,
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.migrationId).toBeDefined();
      expect(response.body.progress).toBeDefined();
    });

    it('should get queue migration by ID', async () => {
      const queueMigration = new queueMigrationModel({
        migrationId: 'migration_123456789_abcdef',
        queueName: 'test-queue',
        source: {
          type: 'redis',
          connection: { host: 'localhost', port: 6379 },
          configuration: { db: 0 },
        },
        target: {
          type: 'redis',
          connection: { host: 'localhost', port: 6380 },
          configuration: { db: 1 },
        },
        mapping: {
          fieldMappings: { old_field: 'new_field' },
          transformations: { transform: 'function' },
          filters: { status: 'active' },
        },
        status: QueueStatus.ACTIVE,
        progress: {
          totalItems: 0,
          processedItems: 0,
          failedItems: 0,
          skippedItems: 0,
          percentage: 0,
        },
        createdBy: 'admin123',
      });

      await queueMigration.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/queue-persistence/migrations/${queueMigration._id}`)
        .expect(200);

      expect(response.body._id).toBe(queueMigration._id?.toString() || '');
      expect(response.body.queueName).toBe('test-queue');
    });

    it('should execute queue migration', async () => {
      const queueMigration = new queueMigrationModel({
        migrationId: 'migration_123456789_abcdef',
        queueName: 'test-queue',
        source: {
          type: 'redis',
          connection: { host: 'localhost', port: 6379 },
          configuration: { db: 0 },
        },
        target: {
          type: 'redis',
          connection: { host: 'localhost', port: 6380 },
          configuration: { db: 1 },
        },
        mapping: {
          fieldMappings: { old_field: 'new_field' },
          transformations: { transform: 'function' },
          filters: { status: 'active' },
        },
        status: QueueStatus.ACTIVE,
        progress: {
          totalItems: 0,
          processedItems: 0,
          failedItems: 0,
          skippedItems: 0,
          percentage: 0,
        },
        createdBy: 'admin123',
      });

      await queueMigration.save();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/queue-persistence/migrations/${queueMigration.migrationId}/execute`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe(QueueStatus.ACTIVE);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.success).toBe(true);
    });
  });

  describe('QueueBackup Management', () => {
    it('should create a queue backup', async () => {
      const createDto = {
        queueName: 'test-queue',
        storage: {
          type: 's3',
          location: 's3://bucket/backups/',
          compression: true,
          encryption: true,
        },
        description: 'Test backup',
        tags: ['test', 'backup'],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/backups')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        queueName: createDto.queueName,
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.backupId).toBeDefined();
      expect(response.body.backup).toBeDefined();
    });

    it('should get queue backup by ID', async () => {
      const queueBackup = new queueBackupModel({
        backupId: 'backup_123456789_abcdef',
        queueName: 'test-queue',
        backup: {
          totalItems: 100,
          items: [],
          configuration: {},
          statistics: {},
        },
        storage: {
          type: 's3',
          location: 's3://bucket/backups/',
          size: 1024,
          checksum: 'abc123',
          compression: true,
          encryption: true,
        },
        status: QueueStatus.ACTIVE,
        createdBy: 'admin123',
      });

      await queueBackup.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/queue-persistence/backups/${queueBackup._id}`)
        .expect(200);

      expect(response.body._id).toBe(queueBackup._id?.toString() || '');
      expect(response.body.queueName).toBe('test-queue');
    });

    it('should get queue backups by queue name', async () => {
      const backup1 = new queueBackupModel({
        backupId: 'backup_123456789_abcdef',
        queueName: 'test-queue',
        backup: {
          totalItems: 100,
          items: [],
          configuration: {},
          statistics: {},
        },
        storage: {
          type: 's3',
          location: 's3://bucket/backups/',
          size: 1024,
          checksum: 'abc123',
          compression: true,
          encryption: true,
        },
        status: QueueStatus.ACTIVE,
        createdBy: 'admin123',
      });

      const backup2 = new queueBackupModel({
        backupId: 'backup_987654321_fedcba',
        queueName: 'other-queue',
        backup: {
          totalItems: 50,
          items: [],
          configuration: {},
          statistics: {},
        },
        storage: {
          type: 'local',
          location: '/backups/',
          size: 512,
          checksum: 'def456',
          compression: false,
          encryption: false,
        },
        status: QueueStatus.ACTIVE,
        createdBy: 'admin123',
      });

      await backup1.save();
      await backup2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/queue-persistence/backups/queue/test-queue')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].queueName).toBe('test-queue');
    });
  });

  describe('QueueRestore Management', () => {
    it('should create a queue restore', async () => {
      const createDto = {
        queueName: 'test-queue',
        backupId: 'backup123',
        target: {
          queueName: 'restored-queue',
          configuration: { maxSize: 1000 },
          overwrite: true,
          merge: false,
        },
        createdBy: 'admin123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/restores')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        queueName: createDto.queueName,
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.restoreId).toBeDefined();
      expect(response.body.progress).toBeDefined();
    });

    it('should get queue restore by ID', async () => {
      const queueRestore = new queueRestoreModel({
        restoreId: 'restore_123456789_abcdef',
        queueName: 'test-queue',
        backupId: 'backup123',
        target: {
          queueName: 'restored-queue',
          configuration: { maxSize: 1000 },
          overwrite: true,
          merge: false,
        },
        status: QueueStatus.ACTIVE,
        progress: {
          totalItems: 0,
          restoredItems: 0,
          failedItems: 0,
          skippedItems: 0,
          percentage: 0,
        },
        createdBy: 'admin123',
      });

      await queueRestore.save();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/queue-persistence/restores/${queueRestore._id}`)
        .expect(200);

      expect(response.body._id).toBe(queueRestore._id?.toString() || '');
      expect(response.body.queueName).toBe('test-queue');
    });

    it('should execute queue restore', async () => {
      const queueRestore = new queueRestoreModel({
        restoreId: 'restore_123456789_abcdef',
        queueName: 'test-queue',
        backupId: 'backup123',
        target: {
          queueName: 'restored-queue',
          configuration: { maxSize: 1000 },
          overwrite: true,
          merge: false,
        },
        status: QueueStatus.ACTIVE,
        progress: {
          totalItems: 0,
          restoredItems: 0,
          failedItems: 0,
          skippedItems: 0,
          percentage: 0,
        },
        createdBy: 'admin123',
      });

      await queueRestore.save();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/queue-persistence/restores/${queueRestore.restoreId}/execute`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe(QueueStatus.ACTIVE);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.success).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should get queue statistics', async () => {
      const operation1 = new queueOperationModel({
        operationId: 'op_123456789_abcdef',
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: { data: { message: 'test message 1' } },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      const operation2 = new queueOperationModel({
        operationId: 'op_987654321_fedcba',
        operationType: QueueOperationType.DEQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ERROR,
        payload: { data: { message: 'test message 2' } },
        retryCount: 1,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await operation1.save();
      await operation2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/queue-persistence/statistics')
        .query({
          queueName: 'test-queue',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        date: expect.any(String),
        queueName: 'test-queue',
        global: {
          totalOperations: 2,
          successfulOperations: 1,
          failedOperations: 1,
        },
      });
      expect(response.body.byOperationType).toBeDefined();
      expect(response.body.persistence).toBeDefined();
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk update queue operation status', async () => {
      const operation1 = new queueOperationModel({
        operationId: 'op_123456789_abcdef',
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: { data: { message: 'test message 1' } },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      const operation2 = new queueOperationModel({
        operationId: 'op_987654321_fedcba',
        operationType: QueueOperationType.DEQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: { data: { message: 'test message 2' } },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await operation1.save();
      await operation2.save();

      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/bulk/update-status')
        .send({
          operationIds: [operation1._id?.toString() || '', operation2._id?.toString() || ''],
          status: QueueStatus.ERROR,
          metadata: { source: 'bulk_operation' },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        successCount: 2,
        errorCount: 0,
      });
    });
  });

  describe('Queue Health Checks', () => {
    it('should get queue health status', async () => {
      const operation1 = new queueOperationModel({
        operationId: 'op_123456789_abcdef',
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
        payload: { data: { message: 'test message 1' } },
        retryCount: 0,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      const operation2 = new queueOperationModel({
        operationId: 'op_987654321_fedcba',
        operationType: QueueOperationType.DEQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ERROR,
        payload: { data: { message: 'test message 2' } },
        retryCount: 1,
        maxRetries: 3,
        createdBy: 'admin123',
      });

      await operation1.save();
      await operation2.save();

      const response = await request(app.getHttpServer())
        .get('/api/v1/queue-persistence/health/test-queue')
        .expect(200);

      expect(response.body).toMatchObject({
        isHealthy: expect.any(Boolean),
        status: expect.any(String),
        metrics: {
          totalOperations: 2,
          successfulOperations: 1,
          failedOperations: 1,
        },
      });
      expect(response.body.issues).toBeDefined();
    });
  });

  describe('Queue Operations', () => {
    it('should enqueue item to queue', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/queues/test-queue/enqueue')
        .send({
          data: { message: 'test message' },
          priority: 1,
          delay: 0,
          ttl: 3600,
          createdBy: 'admin123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        operationType: QueueOperationType.ENQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.operationId).toBeDefined();
    });

    it('should dequeue item from queue', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/queues/test-queue/dequeue')
        .send({
          createdBy: 'admin123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        operationType: QueueOperationType.DEQUEUE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.operationId).toBeDefined();
    });

    it('should peek at queue items', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/queues/test-queue/peek')
        .send({
          createdBy: 'admin123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        operationType: QueueOperationType.PEEK,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.operationId).toBeDefined();
    });

    it('should clear queue', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/queues/test-queue/clear')
        .send({
          createdBy: 'admin123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        operationType: QueueOperationType.CLEAR,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.operationId).toBeDefined();
    });

    it('should pause queue', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/queues/test-queue/pause')
        .send({
          createdBy: 'admin123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        operationType: QueueOperationType.PAUSE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.operationId).toBeDefined();
    });

    it('should resume queue', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/queues/test-queue/resume')
        .send({
          createdBy: 'admin123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        operationType: QueueOperationType.RESUME,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.operationId).toBeDefined();
    });

    it('should prioritize queue items', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/queue-persistence/queues/test-queue/prioritize')
        .send({
          priority: 5,
          createdBy: 'admin123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        operationType: QueueOperationType.PRIORITIZE,
        queueName: 'test-queue',
        status: QueueStatus.ACTIVE,
      });
      expect(response.body.operationId).toBeDefined();
    });
  });
});
