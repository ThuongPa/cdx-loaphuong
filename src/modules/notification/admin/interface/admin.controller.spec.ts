import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminStatisticsService } from '../application/services/admin-statistics.service';
import { BroadcastNotificationService } from '../application/services/broadcast-notification.service';
import { FailedNotificationService } from '../application/services/failed-notification.service';
import { ManualRetryService } from '../application/services/manual-retry.service';
import { AuditLogService } from '../../../../common/services/audit-log.service';
import { RateLimitGuard } from '../../../../common/guards/rate-limit.guard';
import { NotificationPriority } from '../../../../common/types/notification.types';
import { StatisticsPeriod } from './dto/notification-statistics.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let adminStatisticsService: any;
  let broadcastNotificationService: any;
  let failedNotificationService: any;
  let manualRetryService: any;
  let auditLogService: any;

  beforeEach(async () => {
    const mockAdminStatisticsService = {
      getNotificationStatistics: jest.fn(),
    };

    const mockBroadcastNotificationService = {
      createBroadcast: jest.fn(),
    };

    const mockFailedNotificationService = {
      getFailedNotifications: jest.fn(),
      exportToCsv: jest.fn(),
    };

    const mockManualRetryService = {
      retryNotification: jest.fn(),
    };

    const mockAuditLogService = {
      logAdminAction: jest.fn(),
    };

    const mockRateLimitGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminStatisticsService,
          useValue: mockAdminStatisticsService,
        },
        {
          provide: BroadcastNotificationService,
          useValue: mockBroadcastNotificationService,
        },
        {
          provide: FailedNotificationService,
          useValue: mockFailedNotificationService,
        },
        {
          provide: ManualRetryService,
          useValue: mockManualRetryService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: RateLimitGuard,
          useValue: mockRateLimitGuard,
        },
      ],
    })
      .overrideGuard(RateLimitGuard)
      .useValue(mockRateLimitGuard)
      .compile();

    controller = module.get<AdminController>(AdminController);
    adminStatisticsService = mockAdminStatisticsService;
    broadcastNotificationService = mockBroadcastNotificationService;
    failedNotificationService = mockFailedNotificationService;
    manualRetryService = mockManualRetryService;
    auditLogService = mockAuditLogService;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatistics', () => {
    it('should return statistics successfully', async () => {
      const query = { period: StatisticsPeriod.TODAY };
      const mockStatistics = {
        success: true,
        data: {
          totalSent: 100,
          todaySent: 50,
          thisWeekSent: 80,
          thisMonthSent: 100,
          byChannel: { push: 60, email: 30, inApp: 10 },
          byStatus: { sent: 90, failed: 10, pending: 0 },
          deliveryRate: 90,
          topTypes: [{ type: 'announcement', count: 50 }],
          failureReasons: [{ reason: 'INVALID_TOKEN', count: 5 }],
        },
        message: 'Statistics retrieved successfully',
      };

      adminStatisticsService.getNotificationStatistics.mockResolvedValue(mockStatistics);
      auditLogService.logAdminAction.mockResolvedValue(undefined);

      const mockRequest = { user: { id: 'admin1', email: 'admin@example.com', roles: ['admin'] } };

      const result = await controller.getStatistics(query, mockRequest as any);

      expect(result).toEqual(mockStatistics);
      expect(adminStatisticsService.getNotificationStatistics).toHaveBeenCalledWith(query);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        'VIEW_STATISTICS',
        'statistics',
        'admin1',
        'admin@example.com',
        ['admin'],
        mockRequest,
        { query },
      );
    });
  });

  describe('broadcastNotification', () => {
    it('should create broadcast notification successfully', async () => {
      const broadcastDto = {
        title: 'System Maintenance',
        body: 'System will be under maintenance from 2AM to 4AM',
        targetRoles: ['resident', 'staff'],
        channels: ['push', 'email'],
        priority: NotificationPriority.HIGH,
      };

      const mockResult = {
        success: true,
        broadcastId: 'broadcast123',
        targetUserCount: 100,
        message: 'Broadcast notification created successfully',
      };

      broadcastNotificationService.createBroadcast.mockResolvedValue(mockResult);
      auditLogService.logAdminAction.mockResolvedValue(undefined);

      const mockRequest = { user: { id: 'admin1', email: 'admin@example.com', roles: ['admin'] } };

      const result = await controller.broadcastNotification(broadcastDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(broadcastNotificationService.createBroadcast).toHaveBeenCalledWith(broadcastDto);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        'CREATE_BROADCAST',
        'broadcast',
        'admin1',
        'admin@example.com',
        ['admin'],
        mockRequest,
        { broadcastDto },
      );
    });
  });

  describe('getFailedNotifications', () => {
    it('should return failed notifications successfully', async () => {
      const query = { page: 1, limit: 20 };
      const mockResult = {
        success: true,
        data: [
          {
            id: 'notification1',
            userId: 'user1',
            userEmail: 'user1@example.com',
            title: 'Failed Notification',
            type: 'announcement',
            channel: 'push',
            errorMessage: 'Invalid token',
            errorCode: 'INVALID_TOKEN',
            retryCount: 3,
            createdAt: new Date(),
            lastAttemptAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        message: 'Failed notifications retrieved successfully',
      };

      failedNotificationService.getFailedNotifications.mockResolvedValue(mockResult);

      const result = await controller.getFailedNotifications(query);

      expect(result).toEqual(mockResult);
      expect(failedNotificationService.getFailedNotifications).toHaveBeenCalledWith(query);
    });
  });

  describe('retryNotification', () => {
    it('should retry notification successfully', async () => {
      const notificationId = 'notification123';
      const retryDto = { reason: 'Token was refreshed' };
      const mockResult = {
        success: true,
        retryId: 'retry123',
        message: 'Notification retry initiated successfully',
      };

      manualRetryService.retryNotification.mockResolvedValue(mockResult);
      auditLogService.logAdminAction.mockResolvedValue(undefined);

      const mockRequest = { user: { id: 'admin1', email: 'admin@example.com', roles: ['admin'] } };

      const result = await controller.retryNotification(
        notificationId,
        retryDto,
        mockRequest as any,
      );

      expect(result).toEqual(mockResult);
      expect(manualRetryService.retryNotification).toHaveBeenCalledWith(notificationId, retryDto);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        'MANUAL_RETRY',
        'retry',
        'admin1',
        'admin@example.com',
        ['admin'],
        mockRequest,
        { notificationId, retryDto },
      );
    });
  });
});
