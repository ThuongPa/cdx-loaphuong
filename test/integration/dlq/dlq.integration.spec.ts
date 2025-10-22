import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { INestApplication } from '@nestjs/common';
import { DLQService } from '../../../src/modules/notification/integration/dlq/dlq.service';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../src/infrastructure/database/schemas/user-notification.schema';

describe('DLQ Integration Tests', () => {
  let app: INestApplication;
  let dlqService: DLQService;
  let userNotificationModel: Model<UserNotificationDocument>;

  const mockUserNotificationModel = {
    updateOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        DLQService,
        {
          provide: getModelToken(UserNotification.name),
          useValue: mockUserNotificationModel,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dlqService = moduleFixture.get<DLQService>(DLQService);
    userNotificationModel = moduleFixture.get<Model<UserNotificationDocument>>(
      getModelToken(UserNotification.name),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DLQ Service Integration', () => {
    it('should add notification to DLQ and retrieve it', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 3,
        data: { workflowId: 'workflow-1' },
      };
      const mockError = new Error('Max retries exceeded');

      mockUserNotificationModel.updateOne.mockResolvedValue({});

      // Act
      await dlqService.addToDLQ(mockNotification as any, mockError);

      // Assert
      expect(mockUserNotificationModel.updateOne).toHaveBeenCalledWith(
        { id: 'notification-1' },
        {
          $set: {
            status: 'dlq',
            errorMessage: 'DLQ: Max retries exceeded',
            errorCode: 'DLQ_MOVED',
            updatedAt: expect.any(Date),
            data: expect.objectContaining({
              dlqMovedAt: expect.any(Date),
              dlqReason: 'Max retries exceeded',
              dlqStack: expect.any(String),
            }),
          },
        },
      );
    });

    it('should get DLQ entries with pagination', async () => {
      // Arrange
      const mockEntries = [
        {
          id: 'notification-1',
          notificationId: 'notif-1',
          userId: 'user-1',
          errorMessage: 'Error message',
          errorCode: 'ERROR_CODE',
          retryCount: 3,
          updatedAt: new Date(),
          data: {},
        },
        {
          id: 'notification-2',
          notificationId: 'notif-2',
          userId: 'user-2',
          errorMessage: 'Another error',
          errorCode: 'ERROR_CODE_2',
          retryCount: 2,
          updatedAt: new Date(),
          data: {},
        },
      ];

      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockEntries),
            }),
          }),
        }),
      });
      mockUserNotificationModel.countDocuments.mockResolvedValue(2);

      // Act
      const result = await dlqService.getDLQEntries(1, 10);

      // Assert
      expect(result).toEqual({
        entries: expect.arrayContaining([
          expect.objectContaining({
            id: 'notification-1',
            notificationId: 'notif-1',
            userId: 'user-1',
            originalError: 'Error message',
            errorCode: 'ERROR_CODE',
            retryCount: 3,
          }),
          expect.objectContaining({
            id: 'notification-2',
            notificationId: 'notif-2',
            userId: 'user-2',
            originalError: 'Another error',
            errorCode: 'ERROR_CODE_2',
            retryCount: 2,
          }),
        ]),
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should get DLQ statistics', async () => {
      // Arrange
      mockUserNotificationModel.countDocuments.mockResolvedValue(5);
      mockUserNotificationModel.aggregate
        .mockResolvedValueOnce([
          { _id: 'ERROR_1', count: 3 },
          { _id: 'ERROR_2', count: 2 },
        ])
        .mockResolvedValueOnce([
          { _id: 'user-1', count: 3 },
          { _id: 'user-2', count: 2 },
        ]);
      mockUserNotificationModel.findOne
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ updatedAt: new Date('2023-01-01') }),
            }),
          }),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ updatedAt: new Date('2023-12-31') }),
            }),
          }),
        });

      // Act
      const result = await dlqService.getDLQStatistics();

      // Assert
      expect(result).toEqual({
        totalEntries: 5,
        entriesByErrorCode: { ERROR_1: 3, ERROR_2: 2 },
        entriesByUser: { 'user-1': 3, 'user-2': 2 },
        oldestEntry: new Date('2023-01-01'),
        newestEntry: new Date('2023-12-31'),
      });
    });

    it('should retry DLQ entry', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        data: { existingData: 'value' },
      };

      mockUserNotificationModel.findOne.mockResolvedValue(mockNotification);
      mockUserNotificationModel.updateOne.mockResolvedValue({});

      // Act
      const result = await dlqService.retryDLQEntry('notification-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('DLQ entry reset for retry');
      expect(mockUserNotificationModel.updateOne).toHaveBeenCalledWith(
        { id: 'notification-1' },
        {
          $set: {
            status: 'pending',
            retryCount: 0,
            errorMessage: null,
            errorCode: null,
            updatedAt: expect.any(Date),
            data: expect.objectContaining({
              existingData: 'value',
              dlqRetriedAt: expect.any(Date),
              dlqRetryCount: 1,
            }),
          },
        },
      );
    });

    it('should delete DLQ entry', async () => {
      // Arrange
      mockUserNotificationModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      // Act
      const result = await dlqService.deleteDLQEntry('notification-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('DLQ entry deleted');
      expect(mockUserNotificationModel.deleteOne).toHaveBeenCalledWith({
        id: 'notification-1',
        status: 'dlq',
      });
    });

    it('should bulk retry DLQ entries', async () => {
      // Arrange
      const notificationIds = ['notification-1', 'notification-2'];
      const mockNotification = { id: 'notification-1', data: {} };

      mockUserNotificationModel.findOne
        .mockResolvedValueOnce(mockNotification)
        .mockResolvedValueOnce(mockNotification);
      mockUserNotificationModel.updateOne.mockResolvedValue({});

      // Act
      const result = await dlqService.bulkRetryDLQEntries(notificationIds);

      // Assert
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it('should bulk delete DLQ entries', async () => {
      // Arrange
      const notificationIds = ['notification-1', 'notification-2'];

      mockUserNotificationModel.deleteOne
        .mockResolvedValueOnce({ deletedCount: 1 })
        .mockResolvedValueOnce({ deletedCount: 1 });

      // Act
      const result = await dlqService.bulkDeleteDLQEntries(notificationIds);

      // Assert
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it('should cleanup old DLQ entries', async () => {
      // Arrange
      mockUserNotificationModel.deleteMany.mockResolvedValue({ deletedCount: 3 });

      // Act
      const result = await dlqService.cleanupOldEntries(30);

      // Assert
      expect(result.deletedCount).toBe(3);
      expect(mockUserNotificationModel.deleteMany).toHaveBeenCalledWith({
        status: 'dlq',
        updatedAt: { $lt: expect.any(Date) },
      });
    });
  });

  describe('DLQ Error Handling', () => {
    it('should handle DLQ addition errors gracefully', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 3,
        data: { workflowId: 'workflow-1' },
      };
      const mockError = new Error('Max retries exceeded');
      const dlqError = new Error('Database error');

      mockUserNotificationModel.updateOne.mockRejectedValue(dlqError);

      // Act & Assert
      await expect(dlqService.addToDLQ(mockNotification as any, mockError)).rejects.toThrow(
        dlqError,
      );
    });

    it('should handle DLQ retrieval errors gracefully', async () => {
      // Arrange
      const retrievalError = new Error('Database connection failed');
      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockRejectedValue(retrievalError),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(dlqService.getDLQEntries()).rejects.toThrow(retrievalError);
    });

    it('should handle DLQ statistics errors gracefully', async () => {
      // Arrange
      const statsError = new Error('Aggregation failed');
      mockUserNotificationModel.countDocuments.mockRejectedValue(statsError);

      // Act & Assert
      await expect(dlqService.getDLQStatistics()).rejects.toThrow(statsError);
    });
  });

  describe('DLQ Filtering and Search', () => {
    it('should filter DLQ entries by user ID', async () => {
      // Arrange
      const filters = { userId: 'user-1' };

      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockUserNotificationModel.countDocuments.mockResolvedValue(0);

      // Act
      await dlqService.getDLQEntries(1, 10, filters);

      // Assert
      expect(mockUserNotificationModel.find).toHaveBeenCalledWith({
        status: 'dlq',
        userId: 'user-1',
      });
    });

    it('should filter DLQ entries by error code', async () => {
      // Arrange
      const filters = { errorCode: 'INVALID_TOKEN' };

      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockUserNotificationModel.countDocuments.mockResolvedValue(0);

      // Act
      await dlqService.getDLQEntries(1, 10, filters);

      // Assert
      expect(mockUserNotificationModel.find).toHaveBeenCalledWith({
        status: 'dlq',
        errorCode: 'INVALID_TOKEN',
      });
    });

    it('should filter DLQ entries by date range', async () => {
      // Arrange
      const fromDate = new Date('2023-01-01');
      const toDate = new Date('2023-12-31');
      const filters = { fromDate, toDate };

      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockUserNotificationModel.countDocuments.mockResolvedValue(0);

      // Act
      await dlqService.getDLQEntries(1, 10, filters);

      // Assert
      expect(mockUserNotificationModel.find).toHaveBeenCalledWith({
        status: 'dlq',
        updatedAt: {
          $gte: fromDate,
          $lte: toDate,
        },
      });
    });
  });
});
