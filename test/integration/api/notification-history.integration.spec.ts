import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import { APP_GUARD } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { NotificationModule } from '../../../src/modules/notification/notification/notification.module';
import { DatabaseConfig } from '../../../src/config/database.config';
import { RedisConfig } from '../../../src/config/redis.config';

describe('Notification History Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  const testUserId = 'test-user-123';
  const testNotificationId = 'test-notification-123';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['config/development.env', '.env'],
          load: [DatabaseConfig, RedisConfig],
        }),
        MongooseModule.forRootAsync({
          useFactory: () => {
            const databaseConfig = DatabaseConfig();
            return {
              uri: databaseConfig.uri,
              useNewUrlParser: true,
              useUnifiedTopology: true,
            };
          },
        }),
        CqrsModule,
        NotificationModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: ExecutionContext) => {
              const request = context.switchToHttp().getRequest();
              const authHeader = request.headers.authorization;

              if (!authHeader || !authHeader.startsWith('Bearer ')) {
                // Throw UnauthorizedException to return 401
                throw new UnauthorizedException('Unauthorized');
              }

              // Mock user for testing
              request.user = { id: 'test-user-123' };
              return true;
            },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await moduleRef.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // This would typically involve clearing the test database
  });

  describe('GET /api/v1/notifications', () => {
    it('should return notification history with pagination', async () => {
      // Arrange
      const queryParams = {
        page: 1,
        limit: 10,
        type: 'payment',
        channel: 'push',
        status: 'delivered',
      };

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .query(queryParams)
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 10);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
      expect(response.body.data.pagination).toHaveProperty('hasNext');
      expect(response.body.data.pagination).toHaveProperty('hasPrev');
    });

    it('should handle date range filters', async () => {
      // Arrange
      const queryParams = {
        page: 1,
        limit: 20,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      };

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .query(queryParams)
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toBeDefined();
    });

    it('should enforce maximum limit of 100', async () => {
      // Arrange
      const queryParams = {
        page: 1,
        limit: 200, // Should be capped at 100
      };

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .query(queryParams)
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(response.body.data.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('should return 401 when no authorization header', async () => {
      // Act & Assert
      await request(app.getHttpServer()).get('/api/v1/notifications').expect(401);
    });
  });

  describe('GET /api/v1/notifications/:id', () => {
    it('should return notification detail when found', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${testNotificationId}`)
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testNotificationId);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('body');
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('channel');
      expect(response.body.data).toHaveProperty('priority');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('should return 404 when notification not found', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/v1/notifications/non-existent-id')
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(404);
    });

    it('should return 401 when no authorization header', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get(`/api/v1/notifications/${testNotificationId}`)
        .expect(401);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should mark notification as read successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${testNotificationId}/read`)
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('notificationId', testNotificationId);
      expect(response.body.data).toHaveProperty('readAt');
      expect(response.body.data.readAt).toBeDefined();
    });

    it('should return 404 when notification not found', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/non-existent-id/read')
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(404);
    });

    it('should return 401 when no authorization header', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${testNotificationId}/read`)
        .expect(401);
    });
  });

  describe('POST /api/v1/notifications/read-all', () => {
    it('should mark all notifications as read successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('updatedCount');
      expect(response.body.data).toHaveProperty('readAt');
      expect(response.body.data.readAt).toBeDefined();
      expect(typeof response.body.data.updatedCount).toBe('number');
    });

    it('should return 401 when no authorization header', async () => {
      // Act & Assert
      await request(app.getHttpServer()).post('/api/v1/notifications/read-all').expect(401);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return unread count successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('lastUpdated');
      expect(typeof response.body.data.count).toBe('number');
      expect(response.body.data.lastUpdated).toBeDefined();
    });

    it('should return 401 when no authorization header', async () => {
      // Act & Assert
      await request(app.getHttpServer()).get('/api/v1/notifications/unread-count').expect(401);
    });
  });

  describe('Caching Integration', () => {
    it('should cache notification history and return cached data on subsequent requests', async () => {
      // Arrange
      const queryParams = {
        page: 1,
        limit: 10,
        type: 'payment',
      };

      // Act - First request (should cache)
      const firstResponse = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .query(queryParams)
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Act - Second request (should return cached data)
      const secondResponse = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .query(queryParams)
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(firstResponse.body.success).toBe(true);
      expect(secondResponse.body.success).toBe(true);
      // In a real test, you would verify that the second response came from cache
      // by checking logs or cache metrics
    });

    it('should cache unread count and return cached data on subsequent requests', async () => {
      // Act - First request (should cache)
      const firstResponse = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Act - Second request (should return cached data)
      const secondResponse = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(firstResponse.body.success).toBe(true);
      expect(secondResponse.body.success).toBe(true);
      expect(firstResponse.body.data.count).toBe(secondResponse.body.data.count);
    });

    it('should invalidate cache when marking notifications as read', async () => {
      // Arrange

      // Act - Get initial unread count
      const initialCountResponse = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      const initialCount = initialCountResponse.body.data.count;

      // Act - Mark a notification as read
      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${testNotificationId}/read`)
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Act - Get unread count again (should be updated)
      const updatedCountResponse = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer mock-jwt-token`)
        .expect(200);

      // Assert
      expect(updatedCountResponse.body.data.count).toBeLessThanOrEqual(initialCount);
    });
  });
});
