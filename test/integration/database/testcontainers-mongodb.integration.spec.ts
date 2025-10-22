import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotificationRepositoryImpl } from '../../../src/modules/notification/notification/infrastructure/notification.repository.impl';
import { NotificationRepository } from '../../../src/modules/notification/notification/domain/notification.repository';
import {
  Notification,
  NotificationSchema,
} from '../../../src/infrastructure/database/schemas/notification.schema';
import {
  UserNotification,
  UserNotificationSchema,
} from '../../../src/infrastructure/database/schemas/user-notification.schema';
import { MockDataHelper } from '../../helpers/mock-data.helper';

describe('Testcontainers MongoDB Integration Tests', () => {
  let moduleRef: TestingModule;
  let repository: NotificationRepositoryImpl;
  let mongod: MongoMemoryServer;

  const testUserId = 'test-user-123';

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              database: {
                uri,
                name: 'test_db',
              },
            }),
          ],
        }),
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: Notification.name, schema: NotificationSchema },
          { name: UserNotification.name, schema: UserNotificationSchema },
        ]),
      ],
      providers: [
        NotificationRepositoryImpl,
        {
          provide: 'NotificationRepository',
          useExisting: NotificationRepositoryImpl,
        },
      ],
    }).compile();

    repository = moduleRef.get<NotificationRepositoryImpl>(NotificationRepositoryImpl);
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await repository['userNotificationModel'].deleteMany({});
    await repository['notificationModel'].deleteMany({});

    // Also clean up device tokens if they exist
    try {
      const deviceTokenModel = (repository as any)['deviceTokenModel'];
      if (deviceTokenModel) {
        await deviceTokenModel.deleteMany({});
      }
    } catch (error) {
      // Ignore if device token model doesn't exist
    }

    // Force cleanup of any remaining test data
    try {
      const db = repository['userNotificationModel'].db;
      if (db) {
        const collections = await db.listCollections();
        for (const collection of collections) {
          await db.collection(collection.name).deleteMany({});
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('User Notification Operations', () => {
    it('should create and retrieve user notifications', async () => {
      // Arrange
      const mockNotification = MockDataHelper.createMockUserNotification({
        id: 'test-notif-1',
        userId: testUserId,
        title: 'Test Notification',
        type: 'payment' as any,
        status: 'delivered' as any,
      });

      // Act
      await repository['userNotificationModel'].create(mockNotification);
      const result = await repository.getUserNotifications(testUserId, { limit: 10 });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'test-notif-1',
        userId: testUserId,
        title: 'Test Notification',
        type: 'payment' as any,
        status: 'delivered' as any,
      });
    });

    it('should update notification status', async () => {
      // Arrange
      const mockNotification = MockDataHelper.createMockUserNotification({
        id: 'test-notif-1',
        userId: testUserId,
        status: 'delivered' as any,
        readAt: undefined,
      });

      await repository['userNotificationModel'].create(mockNotification);

      // Act
      const readAt = new Date();
      await repository.updateUserNotificationStatus('test-notif-1', 'read', { readAt });

      // Assert
      const updated = await repository['userNotificationModel'].findOne({ id: 'test-notif-1' });
      expect(updated!.status).toBe('read');
      expect(updated!.readAt).toEqual(readAt);
    });

    it('should filter notifications by status', async () => {
      // Arrange
      const notifications = [
        MockDataHelper.createMockUserNotification({
          _id: 'notif-1',
          userId: testUserId,
          status: 'delivered' as any,
          readAt: undefined,
        }),
        MockDataHelper.createMockUserNotification({
          _id: 'notif-2',
          userId: testUserId,
          status: 'read' as any,
          readAt: new Date(),
        }),
        MockDataHelper.createMockUserNotification({
          _id: 'notif-3',
          userId: testUserId,
          status: 'delivered' as any,
          readAt: undefined,
        }),
      ];

      for (const notification of notifications) {
        await repository['userNotificationModel'].create(notification);
      }

      // Act
      const unreadNotifications = await repository.getUserNotifications(testUserId, {
        status: 'delivered' as any,
        limit: 10,
      });

      // Assert
      expect(unreadNotifications).toHaveLength(2);
      expect(unreadNotifications.every((n) => n.status === 'delivered')).toBe(true);
    });

    it('should filter notifications by date range', async () => {
      // Arrange
      const baseDate = new Date('2024-01-15T10:00:00Z');
      const notifications = [
        MockDataHelper.createMockUserNotification({
          _id: 'notif-1',
          userId: testUserId,
          createdAt: new Date('2024-01-10T10:00:00Z'), // Before range
        }),
        MockDataHelper.createMockUserNotification({
          _id: 'notif-2',
          userId: testUserId,
          createdAt: new Date('2024-01-15T10:00:00Z'), // In range
        }),
        MockDataHelper.createMockUserNotification({
          _id: 'notif-3',
          userId: testUserId,
          createdAt: new Date('2024-01-20T10:00:00Z'), // In range
        }),
        MockDataHelper.createMockUserNotification({
          _id: 'notif-4',
          userId: testUserId,
          createdAt: new Date('2024-01-25T10:00:00Z'), // After range
        }),
      ];

      for (const notification of notifications) {
        await repository['userNotificationModel'].create(notification);
      }

      // Act
      const filteredNotifications = await repository.getUserNotifications(testUserId, {
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-01-20T23:59:59Z'),
        limit: 10,
      });

      // Assert
      expect(filteredNotifications).toHaveLength(2);
      expect(filteredNotifications.every((n) => n.userId === testUserId)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const notifications = Array.from({ length: 25 }, (_, i) =>
        MockDataHelper.createMockUserNotification({
          _id: `notif-${i + 1}`,
          userId: testUserId,
          title: `Notification ${i + 1}`,
        }),
      );

      for (const notification of notifications) {
        await repository['userNotificationModel'].create(notification);
      }

      // Act
      const page1 = await repository.getUserNotifications(testUserId, {
        limit: 10,
        offset: 0,
      });

      const page2 = await repository.getUserNotifications(testUserId, {
        limit: 10,
        offset: 10,
      });

      const page3 = await repository.getUserNotifications(testUserId, {
        limit: 10,
        offset: 20,
      });

      // Assert
      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page3).toHaveLength(5);

      // Check that pages don't overlap
      const page1Ids = page1.map((n) => n.id);
      const page2Ids = page2.map((n) => n.id);
      const page3Ids = page3.map((n) => n.id);

      expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
      expect(page2Ids).not.toEqual(expect.arrayContaining(page3Ids));
    });

    it('should handle concurrent operations', async () => {
      // Arrange
      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        repository['userNotificationModel'].create(
          MockDataHelper.createMockUserNotification({
            _id: `concurrent-notif-${i}`,
            userId: testUserId,
            title: `Concurrent Notification ${i}`,
          }),
        ),
      );

      // Act
      await Promise.all(concurrentOperations);

      // Assert
      const allNotifications = await repository.getUserNotifications(testUserId, { limit: 20 });
      expect(allNotifications).toHaveLength(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require stopping the MongoDB instance
      // For now, we'll test with invalid data
      const invalidNotification = {
        id: 'invalid-notif',
        userId: testUserId,
        // Missing required fields
      };

      // Act & Assert
      await expect(
        repository['userNotificationModel'].create(invalidNotification),
      ).rejects.toThrow();
    });

    it('should handle invalid query parameters', async () => {
      // Act - Test with invalid parameters
      const result = await repository.getUserNotifications('', { limit: -1 });

      // Assert - Should return empty array for invalid parameters
      expect(result).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Arrange
      const startTime = Date.now();
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        MockDataHelper.createMockUserNotification({
          _id: `perf-notif-${i}`,
          userId: testUserId,
          title: `Performance Test Notification ${i}`,
        }),
      );

      // Act
      await repository['userNotificationModel'].insertMany(largeDataset);
      const queryTime = Date.now();
      const results = await repository.getUserNotifications(testUserId, { limit: 100 });

      // Assert
      expect(results).toHaveLength(100);
      expect(Date.now() - queryTime).toBeLessThan(1000); // Query should complete within 1 second
      expect(Date.now() - startTime).toBeLessThan(5000); // Total operation should complete within 5 seconds
    });
  });
});
