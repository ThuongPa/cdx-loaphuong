import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';

import { AdminModule } from '../../../../src/modules/notification/admin/admin.module';
import { StatisticsPeriod } from '../../../../src/modules/notification/admin/interface/dto/notification-statistics.dto';

describe('Admin Statistics Integration Tests', () => {
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
    await mongoConnection.collection('announcements').deleteMany({});
  });

  describe('GET /api/v1/admin/statistics', () => {
    it('should return statistics for today', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/statistics')
        .query({ period: StatisticsPeriod.TODAY })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalSent).toBeDefined();
      expect(response.body.data.todaySent).toBeDefined();
      expect(response.body.data.byChannel).toBeDefined();
      expect(response.body.data.byStatus).toBeDefined();
      expect(response.body.data.deliveryRate).toBeDefined();
    });

    it('should return statistics for this week', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/statistics')
        .query({ period: StatisticsPeriod.THIS_WEEK })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.thisWeekSent).toBeDefined();
    });

    it('should return statistics for this month', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/statistics')
        .query({ period: StatisticsPeriod.THIS_MONTH })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.thisMonthSent).toBeDefined();
    });

    it('should return statistics for custom period', async () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/statistics')
        .query({
          period: StatisticsPeriod.CUSTOM,
          startDate,
          endDate,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
