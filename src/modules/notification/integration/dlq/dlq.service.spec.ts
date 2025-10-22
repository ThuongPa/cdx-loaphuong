import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { DLQService } from './dlq.service';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../../infrastructure/database/schemas/user-notification.schema';

describe('DLQService', () => {
  let service: DLQService;
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DLQService,
        {
          provide: getModelToken(UserNotification.name),
          useValue: mockUserNotificationModel,
        },
      ],
    }).compile();

    service = module.get<DLQService>(DLQService);
    userNotificationModel = module.get<Model<UserNotificationDocument>>(
      getModelToken(UserNotification.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToDLQ', () => {
    it('should add notification to DLQ successfully', async () => {
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
      await service.addToDLQ(mockNotification as any, mockError);

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

    it('should add notification to DLQ with additional data', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 3,
        data: { workflowId: 'workflow-1' },
      };
      const mockError = new Error('Max retries exceeded');
      const additionalData = { customField: 'customValue' };

      mockUserNotificationModel.updateOne.mockResolvedValue({});

      // Act
      await service.addToDLQ(mockNotification as any, mockError, additionalData);

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
              customField: 'customValue',
            }),
          },
        },
      );
    });

    it('should handle DLQ addition errors', async () => {
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
      await expect(service.addToDLQ(mockNotification as any, mockError)).rejects.toThrow(dlqError);
    });
  });

  describe('getDLQEntries', () => {
    it('should get DLQ entries with default pagination', async () => {
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
      mockUserNotificationModel.countDocuments.mockResolvedValue(1);

      // Act
      const result = await service.getDLQEntries();

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
        ]),
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should get DLQ entries with filters', async () => {
      // Arrange
      const filters = {
        userId: 'user-1',
        errorCode: 'ERROR_CODE',
        fromDate: new Date('2023-01-01'),
        toDate: new Date('2023-12-31'),
      };

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
      const result = await service.getDLQEntries(1, 10, filters);

      // Assert
      expect(mockUserNotificationModel.find).toHaveBeenCalledWith({
        status: 'dlq',
        userId: 'user-1',
        errorCode: 'ERROR_CODE',
        updatedAt: {
          $gte: filters.fromDate,
          $lte: filters.toDate,
        },
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('getDLQStatistics', () => {
    it('should return DLQ statistics', async () => {
      // Arrange
      mockUserNotificationModel.countDocuments.mockResolvedValue(10);
      mockUserNotificationModel.aggregate
        .mockResolvedValueOnce([
          { _id: 'ERROR_1', count: 5 },
          { _id: 'ERROR_2', count: 3 },
        ])
        .mockResolvedValueOnce([
          { _id: 'user-1', count: 8 },
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
      const result = await service.getDLQStatistics();

      // Assert
      expect(result).toEqual({
        totalEntries: 10,
        entriesByErrorCode: { ERROR_1: 5, ERROR_2: 3 },
        entriesByUser: { 'user-1': 8, 'user-2': 2 },
        oldestEntry: new Date('2023-01-01'),
        newestEntry: new Date('2023-12-31'),
      });
    });
  });

  describe('retryDLQEntry', () => {
    it('should retry DLQ entry successfully', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        data: { existingData: 'value' },
      };

      mockUserNotificationModel.findOne.mockResolvedValue(mockNotification);
      mockUserNotificationModel.updateOne.mockResolvedValue({});

      // Act
      const result = await service.retryDLQEntry('notification-1');

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

    it('should return error when DLQ entry not found', async () => {
      // Arrange
      mockUserNotificationModel.findOne.mockResolvedValue(null);

      // Act
      const result = await service.retryDLQEntry('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('DLQ entry not found');
    });

    it('should handle retry errors', async () => {
      // Arrange
      const mockNotification = { id: 'notification-1', data: {} };
      const retryError = new Error('Database error');

      mockUserNotificationModel.findOne.mockResolvedValue(mockNotification);
      mockUserNotificationModel.updateOne.mockRejectedValue(retryError);

      // Act
      const result = await service.retryDLQEntry('notification-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Retry failed: Database error');
    });
  });

  describe('deleteDLQEntry', () => {
    it('should delete DLQ entry successfully', async () => {
      // Arrange
      mockUserNotificationModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      // Act
      const result = await service.deleteDLQEntry('notification-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('DLQ entry deleted');
      expect(mockUserNotificationModel.deleteOne).toHaveBeenCalledWith({
        id: 'notification-1',
        status: 'dlq',
      });
    });

    it('should return error when DLQ entry not found', async () => {
      // Arrange
      mockUserNotificationModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      // Act
      const result = await service.deleteDLQEntry('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('DLQ entry not found');
    });
  });

  describe('bulkRetryDLQEntries', () => {
    it('should bulk retry DLQ entries', async () => {
      // Arrange
      const notificationIds = ['notification-1', 'notification-2'];
      const mockNotification = { id: 'notification-1', data: {} };

      mockUserNotificationModel.findOne
        .mockResolvedValueOnce(mockNotification)
        .mockResolvedValueOnce(mockNotification);
      mockUserNotificationModel.updateOne.mockResolvedValue({});

      // Act
      const result = await service.bulkRetryDLQEntries(notificationIds);

      // Assert
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it('should handle partial failures in bulk retry', async () => {
      // Arrange
      const notificationIds = ['notification-1', 'notification-2'];
      const mockNotification = { id: 'notification-1', data: {} };

      mockUserNotificationModel.findOne
        .mockResolvedValueOnce(mockNotification)
        .mockResolvedValueOnce(null); // Second one not found
      mockUserNotificationModel.updateOne.mockResolvedValue({});

      // Act
      const result = await service.bulkRetryDLQEntries(notificationIds);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });
  });

  describe('cleanupOldEntries', () => {
    it('should cleanup old DLQ entries', async () => {
      // Arrange
      mockUserNotificationModel.deleteMany.mockResolvedValue({ deletedCount: 5 });

      // Act
      const result = await service.cleanupOldEntries(30);

      // Assert
      expect(result.deletedCount).toBe(5);
      expect(mockUserNotificationModel.deleteMany).toHaveBeenCalledWith({
        status: 'dlq',
        updatedAt: { $lt: expect.any(Date) },
      });
    });

    it('should handle cleanup errors', async () => {
      // Arrange
      const cleanupError = new Error('Database error');
      mockUserNotificationModel.deleteMany.mockRejectedValue(cleanupError);

      // Act & Assert
      await expect(service.cleanupOldEntries(30)).rejects.toThrow(cleanupError);
    });
  });
});
