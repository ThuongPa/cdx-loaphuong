import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';

import { AdminModule } from '../../../../src/modules/notification/admin/admin.module';
import { NotificationPriority } from '../../../../src/common/types/notification.types';

describe('Admin Broadcast Integration Tests', () => {
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
    await mongoConnection.collection('announcements').deleteMany({});
    await mongoConnection.collection('usernotifications').deleteMany({});
  });

  describe('POST /api/v1/admin/broadcast', () => {
    it('should create broadcast notification successfully', async () => {
      const broadcastDto = {
        title: 'System Maintenance',
        body: 'System will be under maintenance from 2AM to 4AM',
        targetRoles: ['resident', 'staff'],
        channels: ['push', 'email'],
        priority: NotificationPriority.HIGH,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/broadcast')
        .send(broadcastDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.broadcastId).toBeDefined();
      expect(response.body.targetUserCount).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should create scheduled broadcast notification', async () => {
      const scheduledDto = {
        title: 'Scheduled Announcement',
        body: 'This is a scheduled announcement',
        targetRoles: ['resident'],
        channels: ['push'],
        priority: NotificationPriority.NORMAL,
        scheduledAt: '2025-12-31T10:00:00Z',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/broadcast')
        .send(scheduledDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.broadcastId).toBeDefined();
    });

    it('should include specific users when provided', async () => {
      const dtoWithSpecificUsers = {
        title: 'Targeted Announcement',
        body: 'This is for specific users',
        targetRoles: ['resident'],
        targetUsers: ['user1', 'user2'],
        channels: ['push'],
        priority: NotificationPriority.HIGH,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/broadcast')
        .send(dtoWithSpecificUsers)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.targetUserCount).toBeGreaterThanOrEqual(0);
    });

    it('should include additional data when provided', async () => {
      const dtoWithData = {
        title: 'Data Announcement',
        body: 'This includes additional data',
        targetRoles: ['resident'],
        channels: ['push'],
        priority: NotificationPriority.NORMAL,
        data: {
          category: 'maintenance',
          severity: 'low',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/broadcast')
        .send(dtoWithData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});
