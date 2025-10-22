import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingRepository } from '../../infrastructure/scheduling.repository';
import { ScheduledNotification } from '../../domain/scheduled-notification.entity';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let repository: jest.Mocked<SchedulingRepository>;

  const mockScheduledNotification = {
    id: '1',
    name: 'Test Scheduled Notification',
    description: 'Test description',
    schedulePattern: {
      type: 'once' as const,
      timezone: 'UTC',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    notificationContent: {
      title: 'Test Title',
      body: 'Test Body',
      priority: 'normal' as const,
    },
    targetAudience: {
      userIds: ['user1', 'user2'],
    },
    status: 'pending' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    nextExecutionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    isActive: true,
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUser: jest.fn(),
      findReadyForExecution: jest.fn(),
      getStatistics: jest.fn(),
      cleanupExpired: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        {
          provide: 'SchedulingRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
    repository = module.get('SchedulingRepository');
  });

  describe('createScheduledNotification', () => {
    it('should create a scheduled notification successfully', async () => {
      const createDto = {
        name: 'Test Scheduled Notification',
        description: 'Test description',
        schedulePattern: {
          type: 'once' as const,
          timezone: 'UTC',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
          priority: 'normal' as const,
        },
        targetAudience: {
          userIds: ['user1', 'user2'],
        },
        createdBy: 'user1',
      };

      const scheduledNotification = ScheduledNotification.create({
        ...createDto,
        status: 'pending',
        scheduledAt: createDto.schedulePattern.scheduledAt!,
        nextExecutionAt: createDto.schedulePattern.scheduledAt!,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        isActive: true,
      });
      repository.create.mockResolvedValue(scheduledNotification);

      const result = await service.createScheduledNotification(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.status).toBe('pending');
      expect(repository.create).toHaveBeenCalledWith(expect.any(ScheduledNotification));
    });

    it('should throw BadRequestException if schedule type is missing', async () => {
      const createDto = {
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: undefined as any,
          timezone: 'UTC',
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        createdBy: 'user1',
      };

      await expect(service.createScheduledNotification(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if timezone is missing', async () => {
      const createDto = {
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'once' as const,
          timezone: undefined as any,
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        createdBy: 'user1',
      };

      await expect(service.createScheduledNotification(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if cron expression is missing for cron type', async () => {
      const createDto = {
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'cron' as const,
          timezone: 'UTC',
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        createdBy: 'user1',
      };

      await expect(service.createScheduledNotification(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if scheduled time is in the past for once type', async () => {
      const createDto = {
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'once' as const,
          timezone: 'UTC',
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        createdBy: 'user1',
      };

      await expect(service.createScheduledNotification(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getScheduledNotificationById', () => {
    it('should return scheduled notification if found', async () => {
      const scheduledNotification = ScheduledNotification.create({
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'once',
          timezone: 'UTC',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        status: 'pending',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        nextExecutionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        isActive: true,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(scheduledNotification);

      const result = await service.getScheduledNotificationById('1');

      expect(result).toBe(scheduledNotification);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if scheduled notification not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getScheduledNotificationById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getScheduledNotifications', () => {
    it('should return scheduled notifications with filters', async () => {
      const scheduledNotifications = [
        ScheduledNotification.create({
          name: 'Test Scheduled Notification',
          schedulePattern: {
            type: 'once',
            timezone: 'UTC',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          notificationContent: {
            title: 'Test Title',
            body: 'Test Body',
          },
          targetAudience: {
            userIds: ['user1'],
          },
          status: 'pending',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          nextExecutionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          isActive: true,
          createdBy: 'user1',
        }),
      ];
      repository.find.mockResolvedValue({
        scheduledNotifications,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const filters = { status: 'pending' };
      const result = await service.getScheduledNotifications(filters);

      expect(result.scheduledNotifications).toBe(scheduledNotifications);
      expect(result.total).toBe(1);
      expect(repository.find).toHaveBeenCalledWith(filters);
    });
  });

  describe('updateScheduledNotification', () => {
    it('should update scheduled notification successfully', async () => {
      const scheduledNotification = ScheduledNotification.create({
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'once',
          timezone: 'UTC',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        status: 'pending',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        nextExecutionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        isActive: true,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(scheduledNotification);
      repository.update.mockResolvedValue(scheduledNotification);

      const updateDto = {
        name: 'Updated Scheduled Notification',
        updatedBy: 'user1',
      };

      const result = await service.updateScheduledNotification('1', updateDto);

      expect(result).toBe(scheduledNotification);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(ScheduledNotification));
    });

    it('should throw NotFoundException if scheduled notification not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateScheduledNotification('1', { updatedBy: 'user1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelScheduledNotification', () => {
    it('should cancel scheduled notification successfully', async () => {
      const scheduledNotification = ScheduledNotification.create({
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'once',
          timezone: 'UTC',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        status: 'pending',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        nextExecutionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        isActive: true,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(scheduledNotification);
      repository.update.mockResolvedValue(scheduledNotification);

      const result = await service.cancelScheduledNotification('1', 'user1');

      expect(result).toBe(scheduledNotification);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(ScheduledNotification));
    });
  });

  describe('deleteScheduledNotification', () => {
    it('should delete scheduled notification successfully', async () => {
      const scheduledNotification = ScheduledNotification.create({
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'once',
          timezone: 'UTC',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        status: 'pending',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        nextExecutionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        isActive: true,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(scheduledNotification);
      repository.delete.mockResolvedValue();

      await service.deleteScheduledNotification('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if scheduled notification not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteScheduledNotification('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getScheduledNotificationsByUser', () => {
    it('should return scheduled notifications by user', async () => {
      const scheduledNotifications = [
        ScheduledNotification.create({
          name: 'Test Scheduled Notification',
          schedulePattern: {
            type: 'once',
            timezone: 'UTC',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          notificationContent: {
            title: 'Test Title',
            body: 'Test Body',
          },
          targetAudience: {
            userIds: ['user1'],
          },
          status: 'pending',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          nextExecutionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          isActive: true,
          createdBy: 'user1',
        }),
      ];
      repository.findByUser.mockResolvedValue(scheduledNotifications);

      const result = await service.getScheduledNotificationsByUser('user1');

      expect(result).toBe(scheduledNotifications);
      expect(repository.findByUser).toHaveBeenCalledWith('user1');
    });
  });

  describe('getReadyForExecution', () => {
    it('should return scheduled notifications ready for execution', async () => {
      const scheduledNotifications = [
        ScheduledNotification.create({
          name: 'Test Scheduled Notification',
          schedulePattern: {
            type: 'once',
            timezone: 'UTC',
            scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          },
          notificationContent: {
            title: 'Test Title',
            body: 'Test Body',
          },
          targetAudience: {
            userIds: ['user1'],
          },
          status: 'pending',
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          nextExecutionAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          isActive: true,
          createdBy: 'user1',
        }),
      ];
      repository.findReadyForExecution.mockResolvedValue(scheduledNotifications);

      const result = await service.getReadyForExecution();

      expect(result).toBe(scheduledNotifications);
      expect(repository.findReadyForExecution).toHaveBeenCalled();
    });
  });

  describe('executeScheduledNotification', () => {
    it('should execute scheduled notification successfully', async () => {
      const scheduledNotification = ScheduledNotification.create({
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'once',
          timezone: 'UTC',
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        status: 'pending',
        scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        nextExecutionAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        isActive: true,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(scheduledNotification);
      repository.update.mockResolvedValue(scheduledNotification);

      const result = await service.executeScheduledNotification('1');

      expect(result).toBe(scheduledNotification);
      expect(repository.update).toHaveBeenCalledTimes(2); // Once for processing, once for completion
    });

    it('should throw BadRequestException if scheduled notification is not ready for execution', async () => {
      const scheduledNotification = ScheduledNotification.create({
        name: 'Test Scheduled Notification',
        schedulePattern: {
          type: 'once',
          timezone: 'UTC',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        },
        notificationContent: {
          title: 'Test Title',
          body: 'Test Body',
        },
        targetAudience: {
          userIds: ['user1'],
        },
        status: 'pending',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        nextExecutionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        isActive: true,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(scheduledNotification);

      await expect(service.executeScheduledNotification('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getScheduledNotificationStatistics', () => {
    it('should return scheduled notification statistics', async () => {
      const stats = {
        total: 10,
        pending: 5,
        scheduled: 3,
        processing: 1,
        completed: 1,
        failed: 0,
        cancelled: 0,
        active: 8,
        inactive: 2,
      };
      repository.getStatistics.mockResolvedValue(stats);

      const result = await service.getScheduledNotificationStatistics();

      expect(result).toBe(stats);
      expect(repository.getStatistics).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredNotifications', () => {
    it('should cleanup expired notifications', async () => {
      repository.cleanupExpired.mockResolvedValue(5);

      const result = await service.cleanupExpiredNotifications();

      expect(result).toBe(5);
      expect(repository.cleanupExpired).toHaveBeenCalledWith(expect.any(Date));
    });
  });
});
