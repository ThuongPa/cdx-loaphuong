import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SchedulingService } from '../../../src/modules/notification/scheduling/scheduling.service';
import {
  ScheduledNotification,
  ScheduledNotificationDocument,
  ScheduleStatus,
} from '../../../src/modules/notification/scheduling/scheduled-notification.schema';
import { StructuredLoggerService } from '../../../src/infrastructure/logging/structured-logger.service';
// import { NotificationService } from '../../../src/modules/notification/notification/notification.service';
import { CategoryTargetingService } from '../../../src/modules/notification/category/category-targeting.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let scheduledNotificationModel: Model<ScheduledNotificationDocument>;
  let structuredLogger: StructuredLoggerService;
  // let notificationService: NotificationService;
  let categoryTargetingService: CategoryTargetingService;

  const mockScheduledNotification = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Scheduled Notification',
    description: 'Test Description',
    schedulePattern: {
      type: 'once',
      timezone: 'America/New_York',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    },
    notificationContent: {
      title: 'Test Title',
      body: 'Test Body',
      priority: 'normal' as any,
    },
    targetAudience: {
      userIds: ['user1', 'user2'],
    },
    status: ScheduleStatus.PENDING,
    isActive: true,
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockScheduledNotificationModel = {
    findById: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockStructuredLogger = {
    logBusinessEvent: jest.fn(),
  };

  const mockNotificationService = {
    sendNotification: jest.fn(),
  };

  const mockCategoryTargetingService = {
    getUsersByMultipleCategories: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        {
          provide: getModelToken(ScheduledNotification.name),
          useValue: mockScheduledNotificationModel,
        },
        {
          provide: StructuredLoggerService,
          useValue: mockStructuredLogger,
        },
        {
          provide: 'NotificationService',
          useValue: mockNotificationService,
        },
        {
          provide: CategoryTargetingService,
          useValue: mockCategoryTargetingService,
        },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
    scheduledNotificationModel = module.get<Model<ScheduledNotificationDocument>>(
      getModelToken(ScheduledNotification.name),
    );
    structuredLogger = module.get<StructuredLoggerService>(StructuredLoggerService);
    // notificationService = module.get<NotificationService>(NotificationService);
    categoryTargetingService = module.get<CategoryTargetingService>(CategoryTargetingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createScheduledNotification', () => {
    it('should create a scheduled notification successfully', async () => {
      const createDto = {
        name: 'Test Scheduled Notification',
        description: 'Test Description',
        schedulePattern: {
          type: 'once' as any,
          timezone: 'America/New_York',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
          priority: 'normal' as any,
        },
        targetAudience: {
          userIds: ['user1', 'user2'],
        },
        createdBy: 'admin',
      };

      mockScheduledNotificationModel.create.mockResolvedValue(mockScheduledNotification);

      const result = await service.createScheduledNotification(createDto);

      expect(mockScheduledNotificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Scheduled Notification',
          description: 'Test Description',
          status: ScheduleStatus.PENDING,
          isActive: true,
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
        }),
      );
      expect(result).toEqual(mockScheduledNotification);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'scheduled_notification_created',
        expect.any(Object),
      );
    });

    it('should throw BadRequestException for invalid schedule pattern', async () => {
      const createDto = {
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'cron' as any,
          timezone: 'America/New_York',
          cronExpression: 'invalid-cron',
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        createdBy: 'admin',
      };

      await expect(service.createScheduledNotification(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockScheduledNotificationModel.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for past scheduled time', async () => {
      const createDto = {
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'once' as any,
          timezone: 'America/New_York',
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        createdBy: 'admin',
      };

      await expect(service.createScheduledNotification(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockScheduledNotificationModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getScheduledNotificationById', () => {
    it('should return scheduled notification if found', async () => {
      mockScheduledNotificationModel.findById.mockResolvedValue(mockScheduledNotification);

      const result = await service.getScheduledNotificationById('507f1f77bcf86cd799439011');

      expect(mockScheduledNotificationModel.findById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockScheduledNotification);
    });

    it('should throw NotFoundException if scheduled notification not found', async () => {
      mockScheduledNotificationModel.findById.mockResolvedValue(null);

      await expect(
        service.getScheduledNotificationById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getScheduledNotifications', () => {
    it('should return scheduled notifications with pagination', async () => {
      const mockResult = {
        scheduledNotifications: [mockScheduledNotification],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockScheduledNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockScheduledNotification]),
            }),
          }),
        }),
      });
      mockScheduledNotificationModel.countDocuments.mockResolvedValue(1);

      const result = await service.getScheduledNotifications({}, 1, 10);

      expect(result).toEqual(mockResult);
    });

    it('should filter by status', async () => {
      mockScheduledNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockScheduledNotificationModel.countDocuments.mockResolvedValue(0);

      await service.getScheduledNotifications({ status: ScheduleStatus.PENDING }, 1, 10);

      expect(mockScheduledNotificationModel.find).toHaveBeenCalledWith({
        status: ScheduleStatus.PENDING,
      });
    });
  });

  describe('updateScheduledNotification', () => {
    it('should update scheduled notification successfully', async () => {
      const updateDto = {
        name: 'Updated Name',
        updatedBy: 'admin',
      };

      mockScheduledNotificationModel.findById.mockResolvedValue(mockScheduledNotification);
      mockScheduledNotificationModel.findByIdAndUpdate.mockResolvedValue({
        ...mockScheduledNotification,
        ...updateDto,
      });

      const result = await service.updateScheduledNotification(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(mockScheduledNotificationModel.findById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(mockScheduledNotificationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining(updateDto),
        { new: true },
      );
      expect(result).toEqual({ ...mockScheduledNotification, ...updateDto });
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'scheduled_notification_updated',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if scheduled notification not found', async () => {
      const updateDto = { name: 'Updated Name', updatedBy: 'admin' };

      mockScheduledNotificationModel.findById.mockResolvedValue(null);

      await expect(
        service.updateScheduledNotification('507f1f77bcf86cd799439011', updateDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockScheduledNotificationModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid schedule pattern update', async () => {
      const updateDto = {
        schedulePattern: {
          type: 'cron' as any,
          timezone: 'America/New_York',
          cronExpression: 'invalid-cron',
        },
        updatedBy: 'admin',
      };

      mockScheduledNotificationModel.findById.mockResolvedValue(mockScheduledNotification);

      await expect(
        service.updateScheduledNotification('507f1f77bcf86cd799439011', updateDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockScheduledNotificationModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('cancelScheduledNotification', () => {
    it('should cancel scheduled notification successfully', async () => {
      const cancelledNotification = {
        ...mockScheduledNotification,
        status: ScheduleStatus.CANCELLED,
        isActive: false,
      };

      mockScheduledNotificationModel.findByIdAndUpdate.mockResolvedValue(cancelledNotification);

      const result = await service.cancelScheduledNotification('507f1f77bcf86cd799439011', 'admin');

      expect(mockScheduledNotificationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          status: ScheduleStatus.CANCELLED,
          isActive: false,
          updatedBy: 'admin',
          updatedAt: expect.any(Date),
        },
        { new: true },
      );
      expect(result).toEqual(cancelledNotification);
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'scheduled_notification_cancelled',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if scheduled notification not found', async () => {
      mockScheduledNotificationModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.cancelScheduledNotification('507f1f77bcf86cd799439011', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteScheduledNotification', () => {
    it('should delete scheduled notification successfully', async () => {
      mockScheduledNotificationModel.findById.mockResolvedValue(mockScheduledNotification);
      mockScheduledNotificationModel.findByIdAndDelete.mockResolvedValue(mockScheduledNotification);

      await service.deleteScheduledNotification('507f1f77bcf86cd799439011');

      expect(mockScheduledNotificationModel.findById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(mockScheduledNotificationModel.findByIdAndDelete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(mockStructuredLogger.logBusinessEvent).toHaveBeenCalledWith(
        'scheduled_notification_deleted',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if scheduled notification not found', async () => {
      mockScheduledNotificationModel.findById.mockResolvedValue(null);

      await expect(service.deleteScheduledNotification('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockScheduledNotificationModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  describe('validateSchedulePattern', () => {
    it('should validate once schedule pattern successfully', async () => {
      const schedulePattern = {
        type: 'once' as any,
        timezone: 'America/New_York',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const result = await service.validateSchedulePattern(schedulePattern);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.nextExecution).toBeDefined();
    });

    it('should validate recurring schedule pattern successfully', async () => {
      const schedulePattern = {
        type: 'recurring',
        recurringType: 'daily',
        timezone: 'America/New_York',
      };

      const result = await service.validateSchedulePattern(schedulePattern);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.nextExecution).toBeDefined();
    });

    it('should validate cron schedule pattern successfully', async () => {
      const schedulePattern = {
        type: 'cron' as any,
        cronExpression: '0 9 * * *', // Daily at 9 AM
        timezone: 'America/New_York',
      };

      const result = await service.validateSchedulePattern(schedulePattern);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.nextExecution).toBeDefined();
    });

    it('should return errors for invalid schedule pattern', async () => {
      const schedulePattern = {
        type: 'once' as any,
        timezone: 'America/New_York',
        scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
      };

      const result = await service.validateSchedulePattern(schedulePattern);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for invalid cron expression', async () => {
      const schedulePattern = {
        type: 'cron' as any,
        cronExpression: 'invalid-cron',
        timezone: 'America/New_York',
      };

      const result = await service.validateSchedulePattern(schedulePattern);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for missing required fields', async () => {
      const schedulePattern = {
        type: 'recurring',
        timezone: 'America/New_York',
        // Missing recurringType
      };

      const result = await service.validateSchedulePattern(schedulePattern);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getScheduledNotificationStatistics', () => {
    it('should return statistics', async () => {
      const mockStats = {
        total: 10,
        pending: 2,
        scheduled: 3,
        processing: 1,
        completed: 3,
        failed: 1,
        cancelled: 0,
        active: 8,
        inactive: 2,
      };

      mockScheduledNotificationModel.aggregate.mockResolvedValue([mockStats]);

      const result = await service.getScheduledNotificationStatistics();

      expect(mockScheduledNotificationModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should return default statistics if no data', async () => {
      mockScheduledNotificationModel.aggregate.mockResolvedValue([]);

      const result = await service.getScheduledNotificationStatistics();

      expect(result).toEqual({
        total: 0,
        pending: 0,
        scheduled: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        active: 0,
        inactive: 0,
      });
    });
  });
});
