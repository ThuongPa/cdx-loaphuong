import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationRepositoryImpl } from '../../../src/modules/notification/notification/infrastructure/notification.repository.impl';
import { NotificationRepository } from '../../../src/modules/notification/notification/domain/notification.repository';
import { DatabaseConfig } from '../../../src/config/database.config';
import {
  Notification,
  NotificationSchema,
} from '../../../src/infrastructure/database/schemas/notification.schema';
import {
  UserNotification,
  UserNotificationSchema,
} from '../../../src/infrastructure/database/schemas/user-notification.schema';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from '../../../src/common/types/notification.types';

describe('NotificationRepository Integration Tests', () => {
  let moduleRef: TestingModule;
  let repository: NotificationRepositoryImpl;

  const testUserId = 'test-user-123';
  const testNotificationId = 'test-notification-123';

  const testUserNotifications = [
    {
      id: 'user-notif-1',
      userId: testUserId,
      notificationId: testNotificationId,
      title: 'Test Notification 1',
      body: 'Test body 1',
      type: NotificationType.PAYMENT,
      channel: NotificationChannel.PUSH,
      priority: NotificationPriority.HIGH,
      status: NotificationStatus.DELIVERED,
      data: { amount: 100 },
      sentAt: new Date('2024-01-01T10:00:00Z'),
      deliveredAt: new Date('2024-01-01T10:01:00Z'),
      readAt: undefined,
      createdAt: new Date('2024-01-01T09:00:00Z'),
      updatedAt: new Date('2024-01-01T10:01:00Z'),
    },
    {
      id: 'user-notif-2',
      userId: testUserId,
      notificationId: 'test-notification-456',
      title: 'Test Notification 2',
      body: 'Test body 2',
      type: NotificationType.BOOKING,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.NORMAL,
      status: NotificationStatus.READ,
      data: { bookingId: 'booking-123' },
      sentAt: new Date('2024-01-02T10:00:00Z'),
      deliveredAt: new Date('2024-01-02T10:01:00Z'),
      readAt: new Date('2024-01-02T11:00:00Z'),
      createdAt: new Date('2024-01-02T09:00:00Z'),
      updatedAt: new Date('2024-01-02T11:00:00Z'),
    },
    {
      id: 'user-notif-3',
      userId: testUserId,
      notificationId: 'test-notification-789',
      title: 'Test Notification 3',
      body: 'Test body 3',
      type: NotificationType.ANNOUNCEMENT,
      channel: NotificationChannel.IN_APP,
      priority: NotificationPriority.LOW,
      status: NotificationStatus.DELIVERED,
      data: { announcementId: 'announcement-123' },
      sentAt: new Date('2024-01-03T10:00:00Z'),
      deliveredAt: new Date('2024-01-03T10:01:00Z'),
      readAt: undefined,
      createdAt: new Date('2024-01-03T09:00:00Z'),
      updatedAt: new Date('2024-01-03T10:01:00Z'),
    },
  ];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['config/development.env', '.env'],
          load: [DatabaseConfig],
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
        MongooseModule.forFeature([
          { name: Notification.name, schema: NotificationSchema },
          { name: UserNotification.name, schema: UserNotificationSchema },
        ]),
      ],
      providers: [
        {
          provide: 'NotificationRepository',
          useClass: NotificationRepositoryImpl,
        },
        NotificationRepositoryImpl,
      ],
    }).compile();

    repository = moduleRef.get<NotificationRepositoryImpl>(NotificationRepositoryImpl);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
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

  describe('getUserNotifications', () => {
    beforeEach(async () => {
      // Insert test data with unique IDs to avoid conflicts
      const uniqueTestData = testUserNotifications.map((notification, index) => ({
        ...notification,
        id: `user-notif-${Date.now()}-${index}`,
        _id: `user-notif-${Date.now()}-${index}`,
      }));

      for (const notification of uniqueTestData) {
        await repository.saveUserNotification(notification);
      }
    });

    it('should return all user notifications with default options', async () => {
      // Act
      const result = await repository.getUserNotifications(testUserId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((notification) => notification.userId === testUserId)).toBe(true);
      expect(result.some((notification) => notification.type === 'payment')).toBe(true);
      expect(result.some((notification) => notification.type === 'booking')).toBe(true);
      expect(result.some((notification) => notification.type === 'announcement')).toBe(true);
    });

    it('should filter by status correctly', async () => {
      // Act
      const deliveredNotifications = await repository.getUserNotifications(testUserId, {
        status: 'delivered',
      });

      const readNotifications = await repository.getUserNotifications(testUserId, {
        status: 'read',
      });

      // Assert
      expect(deliveredNotifications).toHaveLength(2);
      expect(deliveredNotifications.every((n) => n.status === 'delivered')).toBe(true);

      expect(readNotifications).toHaveLength(1);
      expect(readNotifications[0].status).toBe('read');
    });

    it('should filter by channel correctly', async () => {
      // Act
      const pushNotifications = await repository.getUserNotifications(testUserId, {
        channel: 'push',
      });

      const emailNotifications = await repository.getUserNotifications(testUserId, {
        channel: 'email',
      });

      // Assert
      expect(pushNotifications).toHaveLength(1);
      expect(pushNotifications[0].channel).toBe('push');

      expect(emailNotifications).toHaveLength(1);
      expect(emailNotifications[0].channel).toBe('email');
    });

    it('should filter by type correctly', async () => {
      // Act
      const paymentNotifications = await repository.getUserNotifications(testUserId, {
        type: 'payment',
      });

      const bookingNotifications = await repository.getUserNotifications(testUserId, {
        type: 'booking',
      });

      // Assert
      expect(paymentNotifications).toHaveLength(1);
      expect(paymentNotifications[0].type).toBe('payment');

      expect(bookingNotifications).toHaveLength(1);
      expect(bookingNotifications[0].type).toBe('booking');
    });

    it('should apply pagination correctly', async () => {
      // Act
      const firstPage = await repository.getUserNotifications(testUserId, {
        limit: 2,
        offset: 0,
      });

      const secondPage = await repository.getUserNotifications(testUserId, {
        limit: 2,
        offset: 2,
      });

      // Assert
      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(1);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });

    it('should filter by date range correctly', async () => {
      // Act - Use current date range
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
      );

      const todayNotifications = await repository.getUserNotifications(testUserId, {
        startDate: startOfToday,
        endDate: endOfToday,
      });

      const tomorrowNotifications = await repository.getUserNotifications(testUserId, {
        startDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000),
      });

      // Assert
      expect(todayNotifications).toHaveLength(3);
      expect(tomorrowNotifications).toHaveLength(0);
    });

    it('should combine multiple filters correctly', async () => {
      // Act
      const result = await repository.getUserNotifications(testUserId, {
        status: 'delivered',
        channel: 'push',
        type: 'payment',
        limit: 10,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        status: 'delivered',
        channel: 'push',
        type: 'payment',
      });
    });

    it('should enforce maximum limit of 100', async () => {
      // Act
      const result = await repository.getUserNotifications(testUserId, {
        limit: 200,
      });

      // Assert
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getUserNotificationCount', () => {
    beforeEach(async () => {
      // Insert test data
      for (const notification of testUserNotifications) {
        await repository.saveUserNotification(notification);
      }
    });

    it('should return total count when no status filter', async () => {
      // Act
      const totalCount = await repository.getUserNotificationCount(testUserId);

      // Assert
      expect(totalCount).toBe(3);
    });

    it('should return count by status correctly', async () => {
      // Act
      const deliveredCount = await repository.getUserNotificationCount(testUserId, 'delivered');
      const readCount = await repository.getUserNotificationCount(testUserId, 'read');

      // Assert
      expect(deliveredCount).toBe(2);
      expect(readCount).toBe(1);
    });

    it('should return zero for non-existent status', async () => {
      // Act
      const pendingCount = await repository.getUserNotificationCount(testUserId, 'pending');

      // Assert
      expect(pendingCount).toBe(0);
    });
  });

  describe('updateUserNotificationStatus', () => {
    beforeEach(async () => {
      // Insert test data
      await repository.saveUserNotification(testUserNotifications[0]);
    });

    it('should update notification status correctly', async () => {
      // Arrange
      const notificationId = testUserNotifications[0].id;
      const readAt = new Date('2024-01-01T12:00:00Z');

      // Act
      await repository.updateUserNotificationStatus(notificationId, 'read', { readAt });

      // Assert
      const updatedNotifications = await repository.getUserNotifications(testUserId, {
        status: 'read',
      });

      expect(updatedNotifications).toHaveLength(1);
      expect(updatedNotifications[0].status).toBe('read');
      expect(updatedNotifications[0].readAt).toEqual(readAt);
    });

    it('should update notification with additional data', async () => {
      // Arrange
      const notificationId = testUserNotifications[0].id;
      const sentAt = new Date('2024-01-01T10:00:00Z');
      const deliveredAt = new Date('2024-01-01T10:01:00Z');
      const deliveryId = 'delivery-123';

      // Act
      await repository.updateUserNotificationStatus(notificationId, 'delivered', {
        sentAt,
        deliveredAt,
        deliveryId,
      });

      // Assert
      const updatedNotifications = await repository.getUserNotifications(testUserId, {
        status: 'delivered',
      });

      expect(updatedNotifications).toHaveLength(1);
      expect(updatedNotifications[0].status).toBe('delivered');
      expect(updatedNotifications[0].sentAt).toEqual(sentAt);
      expect(updatedNotifications[0].deliveredAt).toEqual(deliveredAt);
      expect(updatedNotifications[0].deliveryId).toBe(deliveryId);
    });
  });

  describe('Database Performance', () => {
    beforeEach(async () => {
      // Insert large amount of test data for performance testing
      const largeDataSet = [];
      for (let i = 0; i < 1000; i++) {
        largeDataSet.push({
          id: `perf-test-${i}`,
          userId: testUserId,
          notificationId: `notification-${i}`,
          title: `Performance Test Notification ${i}`,
          body: `Performance test body ${i}`,
          type: i % 2 === 0 ? 'payment' : 'booking',
          channel: i % 3 === 0 ? 'push' : i % 3 === 1 ? 'email' : 'inApp',
          priority: ['urgent', 'high', 'normal', 'low'][i % 4],
          status:
            i % 4 === 0 ? 'delivered' : i % 4 === 1 ? 'read' : i % 4 === 2 ? 'sent' : 'pending',
          data: { testId: i },
          sentAt: new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`),
          deliveredAt: new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}T10:01:00Z`),
          readAt:
            i % 4 === 1
              ? new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}T11:00:00Z`)
              : null,
          createdAt: new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}T09:00:00Z`),
          updatedAt: new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}T10:01:00Z`),
        });
      }

      // Batch insert for better performance
      for (const notification of largeDataSet) {
        await repository.saveUserNotification(notification);
      }
    });

    it('should handle large dataset queries efficiently', async () => {
      // Act
      const startTime = Date.now();
      const result = await repository.getUserNotifications(testUserId, {
        limit: 50,
        offset: 0,
      });
      const endTime = Date.now();

      // Assert
      expect(result).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle filtered queries efficiently', async () => {
      // Act
      const startTime = Date.now();
      const result = await repository.getUserNotifications(testUserId, {
        status: 'delivered',
        type: 'payment',
        limit: 100,
      });
      const endTime = Date.now();

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((n) => n.status === 'delivered' && n.type === 'payment')).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle count queries efficiently', async () => {
      // Act
      const startTime = Date.now();
      const count = await repository.getUserNotificationCount(testUserId, 'delivered');
      const endTime = Date.now();

      // Assert
      expect(count).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });
});
