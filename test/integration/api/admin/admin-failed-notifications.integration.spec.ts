import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';

import { AdminModule } from '../../../../src/modules/notification/admin/admin.module';

describe('Admin Failed Notifications Integration Tests', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(mongoUri),
        AdminModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Connect to MongoDB
    mongoConnection = (await connect(mongoUri)).connection;
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongoServer.stop();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database after each test
    await mongoConnection.collection('usernotifications').deleteMany({});
    await mongoConnection.collection('users').deleteMany({});
  });

  describe('GET /api/v1/admin/failed', () => {
    it('should return failed notifications with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/failed')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should filter by date range', async () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/failed')
        .query({
          startDate,
          endDate,
          page: 1,
          limit: 20,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should filter by error type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/failed')
        .query({
          errorType: 'INVALID_TOKEN',
          page: 1,
          limit: 20,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should filter by notification type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/failed')
        .query({
          notificationType: 'announcement',
          page: 1,
          limit: 20,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/v1/admin/failed/export', () => {
    it('should export failed notifications to CSV', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/failed/export')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('ID,User ID,User Email');
    });

    it('should export with date range filter', async () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/failed/export')
        .query({
          startDate,
          endDate,
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('ID,User ID,User Email');
    });
  });
});
