import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';

import { AdminModule } from '../../../../src/modules/notification/admin/admin.module';

describe('Admin Manual Retry Integration Tests', () => {
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
  });

  describe('POST /api/v1/admin/notifications/:id/retry', () => {
    it('should retry notification successfully', async () => {
      const notificationId = 'notification123';
      const retryDto = { reason: 'Token was refreshed' };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/notifications/${notificationId}/retry`)
        .send(retryDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.retryId).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should retry notification without reason', async () => {
      const notificationId = 'notification123';
      const retryDto = {};

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/notifications/${notificationId}/retry`)
        .send(retryDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.retryId).toBeDefined();
    });

    it('should return 404 for non-existent notification', async () => {
      const notificationId = 'nonexistent123';
      const retryDto = { reason: 'Manual retry' };

      await request(app.getHttpServer())
        .post(`/api/v1/admin/notifications/${notificationId}/retry`)
        .send(retryDto)
        .expect(404);
    });
  });
});
