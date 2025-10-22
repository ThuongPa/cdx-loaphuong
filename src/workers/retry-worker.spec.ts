import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { RetryWorkerService } from './retry-worker';
import { NovuWorkflowService } from '../infrastructure/external/novu/novu-workflow.service';
import { CircuitBreakerService } from '../infrastructure/external/circuit-breaker/circuit-breaker.service';
import { ErrorClassifierService, ErrorType } from '../common/services/error-classifier.service';
import { DLQService } from '../modules/notification/integration/dlq/dlq.service';
import { TokenCleanupService } from '../modules/notification/domain/services/token-cleanup.service';
import { Res } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  UserNotification,
  UserNotificationDocument,
} from '../infrastructure/database/schemas/user-notification.schema';

describe('RetryWorkerService', () => {
  let service: RetryWorkerService;
  let userNotificationModel: Model<UserNotificationDocument>;
  let novuWorkflowService: NovuWorkflowService;
  let circuitBreakerService: CircuitBreakerService;
  let errorClassifierService: ErrorClassifierService;
  let dlqService: DLQService;
  let tokenCleanupService: TokenCleanupService;

  const mockUserNotificationModel = {
    find: jest.fn(),
    updateOne: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockNovuWorkflowService = {
    triggerWorkflow: jest.fn(),
  };

  const mockCircuitBreakerService = {
    isCircuitOpen: jest.fn(),
  };

  const mockErrorClassifierService = {
    classifyError: jest.fn(),
  };

  const mockDLQService = {
    addToDLQ: jest.fn(),
  };

  const mockTokenCleanupService = {
    cleanupInvalidToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryWorkerService,
        {
          provide: getModelToken(UserNotification.name),
          useValue: mockUserNotificationModel,
        },
        {
          provide: NovuWorkflowService,
          useValue: mockNovuWorkflowService,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
        {
          provide: ErrorClassifierService,
          useValue: mockErrorClassifierService,
        },
        {
          provide: DLQService,
          useValue: mockDLQService,
        },
        {
          provide: TokenCleanupService,
          useValue: mockTokenCleanupService,
        },
      ],
    }).compile();

    service = module.get<RetryWorkerService>(RetryWorkerService);
    userNotificationModel = module.get<Model<UserNotificationDocument>>(
      getModelToken(UserNotification.name),
    );
    novuWorkflowService = module.get<NovuWorkflowService>(NovuWorkflowService);
    circuitBreakerService = module.get<CircuitBreakerService>(CircuitBreakerService);
    errorClassifierService = module.get<ErrorClassifierService>(ErrorClassifierService);
    dlqService = module.get<DLQService>(DLQService);
    tokenCleanupService = module.get<TokenCleanupService>(TokenCleanupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processFailedNotifications', () => {
    it('should skip processing when circuit breaker is open', async () => {
      // Arrange
      mockCircuitBreakerService.isCircuitOpen.mockReturnValue(true);
      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Act
      await service.processFailedNotifications();

      // Assert
      expect(mockCircuitBreakerService.isCircuitOpen).toHaveBeenCalledWith('novu-api');
      expect(mockUserNotificationModel.find).not.toHaveBeenCalled();
    });

    it('should process failed notifications when circuit breaker is closed', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 0,
        data: { workflowId: 'workflow-1' },
      };

      mockCircuitBreakerService.isCircuitOpen.mockReturnValue(false);
      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockNotification]),
          }),
        }),
      });
      mockUserNotificationModel.updateOne.mockResolvedValue({});
      mockNovuWorkflowService.triggerWorkflow.mockResolvedValue({ deliveryId: 'delivery-1' });

      // Act
      await service.processFailedNotifications();

      // Assert
      expect(mockUserNotificationModel.find).toHaveBeenCalled();
      expect(mockUserNotificationModel.updateOne).toHaveBeenCalled();
      expect(mockNovuWorkflowService.triggerWorkflow).toHaveBeenCalled();
    });

    it('should handle retry failures and classify errors', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 0,
        data: { workflowId: 'workflow-1' },
      };

      const mockError = new Error('Network timeout');
      const mockErrorClassification = {
        type: ErrorType.RETRYABLE,
        shouldRetry: true,
        shouldCleanupToken: false,
        shouldMoveToDLQ: false,
        userFriendlyMessage: 'Temporary error. Will retry automatically.',
      };

      mockCircuitBreakerService.isCircuitOpen.mockReturnValue(false);
      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockNotification]),
          }),
        }),
      });
      mockUserNotificationModel.updateOne.mockResolvedValue({});
      mockNovuWorkflowService.triggerWorkflow.mockRejectedValue(mockError);
      mockErrorClassifierService.classifyError.mockReturnValue(mockErrorClassification);

      // Act
      await service.processFailedNotifications();

      // Assert
      expect(mockErrorClassifierService.classifyError).toHaveBeenCalledWith(mockError);
      expect(mockUserNotificationModel.updateOne).toHaveBeenCalledWith(
        { id: 'notification-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'failed',
            errorMessage: mockErrorClassification.userFriendlyMessage,
          }),
        }),
      );
    });

    it('should cleanup invalid tokens when error classification indicates token cleanup', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 0,
        data: { workflowId: 'workflow-1' },
      };

      const mockError = new Error('Invalid token');
      const mockErrorClassification = {
        type: ErrorType.TOKEN_INVALID,
        shouldRetry: false,
        shouldCleanupToken: true,
        shouldMoveToDLQ: false,
        userFriendlyMessage: 'Device token is invalid and has been removed.',
      };

      mockCircuitBreakerService.isCircuitOpen.mockReturnValue(false);
      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockNotification]),
          }),
        }),
      });
      mockUserNotificationModel.updateOne.mockResolvedValue({});
      mockNovuWorkflowService.triggerWorkflow.mockRejectedValue(mockError);
      mockErrorClassifierService.classifyError.mockReturnValue(mockErrorClassification);
      mockTokenCleanupService.cleanupInvalidToken.mockResolvedValue({
        success: true,
        tokensRemoved: 1,
        subscribersRemoved: 1,
        errors: [],
      });

      // Act
      await service.processFailedNotifications();

      // Assert
      expect(mockTokenCleanupService.cleanupInvalidToken).toHaveBeenCalledWith(
        'user-1',
        mockError,
        ErrorType.TOKEN_INVALID,
      );
    });

    it('should move to DLQ when max retries exceeded', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 2, // Max retries is 3, so this will exceed
        data: { workflowId: 'workflow-1' },
      };

      const mockError = new Error('Persistent failure');
      const mockErrorClassification = {
        type: ErrorType.NON_RETRYABLE,
        shouldRetry: false,
        shouldCleanupToken: false,
        shouldMoveToDLQ: true,
        userFriendlyMessage: 'Request error. Please check your data and try again.',
      };

      mockCircuitBreakerService.isCircuitOpen.mockReturnValue(false);
      mockUserNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockNotification]),
          }),
        }),
      });
      mockUserNotificationModel.updateOne.mockResolvedValue({});
      mockNovuWorkflowService.triggerWorkflow.mockRejectedValue(mockError);
      mockErrorClassifierService.classifyError.mockReturnValue(mockErrorClassification);
      mockDLQService.addToDLQ.mockResolvedValue(undefined);

      // Act
      await service.processFailedNotifications();

      // Assert
      expect(mockDLQService.addToDLQ).toHaveBeenCalledWith(mockNotification, mockError);
    });
  });

  describe('manualRetry', () => {
    it('should successfully retry a notification', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        status: 'failed',
        retryCount: 1,
        data: { workflowId: 'workflow-1' },
      };

      mockUserNotificationModel.findOne.mockResolvedValue(mockNotification);
      mockUserNotificationModel.updateOne.mockResolvedValue({});
      mockNovuWorkflowService.triggerWorkflow.mockResolvedValue({ deliveryId: 'delivery-1' });

      // Act
      const result = await service.manualRetry('notification-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification retry initiated');
      expect(mockUserNotificationModel.updateOne).toHaveBeenCalledWith(
        { id: 'notification-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            retryCount: 0,
            status: 'pending',
          }),
        }),
      );
    });

    it('should return error when notification not found', async () => {
      // Arrange
      mockUserNotificationModel.findOne.mockResolvedValue(null);

      // Act
      const result = await service.manualRetry('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Notification not found');
    });

    it('should return error when notification is not in failed or DLQ status', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        status: 'sent',
      };

      mockUserNotificationModel.findOne.mockResolvedValue(mockNotification);

      // Act
      const result = await service.manualRetry('notification-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Notification is not in failed or DLQ status');
    });
  });

  describe('getRetryStatistics', () => {
    it('should return retry statistics', async () => {
      // Arrange
      mockUserNotificationModel.countDocuments
        .mockResolvedValueOnce(100) // totalFailed
        .mockResolvedValueOnce(50) // pendingRetry
        .mockResolvedValueOnce(10) // dlqCount
        .mockResolvedValueOnce(30) // retrySuccess
        .mockResolvedValueOnce(40); // totalRetries

      // Act
      const result = await service.getRetryStatistics();

      // Assert
      expect(result).toEqual({
        totalFailed: 100,
        pendingRetry: 50,
        dlqCount: 10,
        retrySuccessRate: 75, // (30/40) * 100
      });
    });
  });
});
