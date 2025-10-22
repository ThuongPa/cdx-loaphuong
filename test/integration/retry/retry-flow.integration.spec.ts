import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { INestApplication } from '@nestjs/common';
import { RetryWorkerService } from '../../../src/workers/retry-worker';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../src/infrastructure/database/schemas/user-notification.schema';
import { NovuWorkflowService } from '../../../src/infrastructure/external/novu/novu-workflow.service';
import { CircuitBreakerService } from '../../../src/infrastructure/external/circuit-breaker/circuit-breaker.service';
import {
  ErrorClassifierService,
  ErrorType,
} from '../../../src/common/services/error-classifier.service';
import { DLQService } from '../../../src/modules/notification/integration/dlq/dlq.service';
import { TokenCleanupService } from '../../../src/modules/notification/domain/services/token-cleanup.service';
import { NotificationStatus } from '../../../src/common/enums/notification-status.enum';

describe('Retry Flow Integration Tests', () => {
  let app: INestApplication;
  let retryWorkerService: RetryWorkerService;
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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

    app = moduleFixture.createNestApplication();
    await app.init();

    retryWorkerService = moduleFixture.get<RetryWorkerService>(RetryWorkerService);
    userNotificationModel = moduleFixture.get<Model<UserNotificationDocument>>(
      getModelToken(UserNotification.name),
    );
    novuWorkflowService = moduleFixture.get<NovuWorkflowService>(NovuWorkflowService);
    circuitBreakerService = moduleFixture.get<CircuitBreakerService>(CircuitBreakerService);
    errorClassifierService = moduleFixture.get<ErrorClassifierService>(ErrorClassifierService);
    dlqService = moduleFixture.get<DLQService>(DLQService);
    tokenCleanupService = moduleFixture.get<TokenCleanupService>(TokenCleanupService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Retry Flow', () => {
    it('should successfully retry a failed notification', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 0,
        data: { workflowId: 'workflow-1' },
        status: NotificationStatus.FAILED,
        title: 'Test Title',
        body: 'Test Body',
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
      await retryWorkerService.processFailedNotifications();

      // Assert
      expect(mockUserNotificationModel.updateOne).toHaveBeenCalledWith(
        { id: 'notification-1' },
        expect.objectContaining({
          $inc: { retryCount: 1 },
          $set: expect.objectContaining({
            status: NotificationStatus.PENDING,
          }),
        }),
      );

      expect(mockNovuWorkflowService.triggerWorkflow).toHaveBeenCalledWith({
        workflowId: 'workflow-1',
        recipients: ['user-1'],
        payload: expect.objectContaining({
          title: expect.any(String),
          body: expect.any(String),
          notificationId: 'notification-1',
        }),
      });

      expect(mockUserNotificationModel.updateOne).toHaveBeenCalledWith(
        { id: 'notification-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: NotificationStatus.SENT,
            sentAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should handle retryable errors and retry again', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 1,
        data: { workflowId: 'workflow-1' },
        status: NotificationStatus.FAILED,
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
      await retryWorkerService.processFailedNotifications();

      // Assert
      expect(mockErrorClassifierService.classifyError).toHaveBeenCalledWith(mockError);
      expect(mockUserNotificationModel.updateOne).toHaveBeenCalledWith(
        { id: 'notification-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: NotificationStatus.FAILED,
            errorMessage: mockErrorClassification.userFriendlyMessage,
          }),
        }),
      );
      expect(mockDLQService.addToDLQ).not.toHaveBeenCalled();
    });

    it('should handle token invalid errors and cleanup tokens', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 0,
        data: { workflowId: 'workflow-1' },
        status: NotificationStatus.FAILED,
      };

      const mockError = new Error('Invalid device token');
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
      await retryWorkerService.processFailedNotifications();

      // Assert
      expect(mockTokenCleanupService.cleanupInvalidToken).toHaveBeenCalledWith(
        'user-1',
        mockError,
        ErrorType.TOKEN_INVALID,
      );
      expect(mockDLQService.addToDLQ).not.toHaveBeenCalled();
    });

    it('should move to DLQ when max retries exceeded', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 2, // Max retries is 3, so this will exceed
        data: { workflowId: 'workflow-1' },
        status: NotificationStatus.FAILED,
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
      await retryWorkerService.processFailedNotifications();

      // Assert
      expect(mockDLQService.addToDLQ).toHaveBeenCalledWith(mockNotification, mockError);
    });

    it('should skip processing when circuit breaker is open', async () => {
      // Arrange
      mockCircuitBreakerService.isCircuitOpen.mockReturnValue(true);

      // Act
      await retryWorkerService.processFailedNotifications();

      // Assert
      expect(mockUserNotificationModel.find).not.toHaveBeenCalled();
      expect(mockNovuWorkflowService.triggerWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('DLQ Integration', () => {
    it('should integrate DLQ service with retry worker', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 3,
        data: { workflowId: 'workflow-1' },
        status: NotificationStatus.FAILED,
      };

      const mockError = new Error('Max retries exceeded');
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
      await retryWorkerService.processFailedNotifications();

      // Assert
      expect(mockDLQService.addToDLQ).toHaveBeenCalledWith(mockNotification, mockError);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should integrate circuit breaker with retry worker', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 0,
        data: { workflowId: 'workflow-1' },
        status: NotificationStatus.FAILED,
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
      await retryWorkerService.processFailedNotifications();

      // Assert
      expect(mockCircuitBreakerService.isCircuitOpen).toHaveBeenCalledWith('novu-api');
      expect(mockNovuWorkflowService.triggerWorkflow).toHaveBeenCalled();
    });
  });

  describe('Error Classification Integration', () => {
    it('should integrate error classifier with retry worker', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 0,
        data: { workflowId: 'workflow-1' },
        status: NotificationStatus.FAILED,
      };

      const mockError = new Error('Test error');
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
      await retryWorkerService.processFailedNotifications();

      // Assert
      expect(mockErrorClassifierService.classifyError).toHaveBeenCalledWith(mockError);
      expect(mockUserNotificationModel.updateOne).toHaveBeenCalledWith(
        { id: 'notification-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            errorMessage: mockErrorClassification.userFriendlyMessage,
          }),
        }),
      );
    });
  });

  describe('Token Cleanup Integration', () => {
    it('should integrate token cleanup with retry worker', async () => {
      // Arrange
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        retryCount: 0,
        data: { workflowId: 'workflow-1' },
        status: NotificationStatus.FAILED,
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
      await retryWorkerService.processFailedNotifications();

      // Assert
      expect(mockTokenCleanupService.cleanupInvalidToken).toHaveBeenCalledWith(
        'user-1',
        mockError,
        ErrorType.TOKEN_INVALID,
      );
    });
  });
});
