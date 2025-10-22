import { Injectable, Logger, Get, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Type } from 'class-transformer';

import {
  UserNotification,
  UserNotificationDocument,
} from '../infrastructure/database/schemas/user-notification.schema';
import { NovuWorkflowService } from '../infrastructure/external/novu/novu-workflow.service';
import { CircuitBreakerService } from '../infrastructure/external/circuit-breaker/circuit-breaker.service';
import { ErrorClassifierService } from '../common/services/error-classifier.service';
import { DLQService } from '../modules/notification/integration/dlq/dlq.service';
import { TokenCleanupService } from '../modules/notification/domain/services/token-cleanup.service';
import { NotificationStatus } from '../common/enums/notification-status.enum';
import { ErrorType } from '../common/services/error-classifier.service';

interface RetryConfig {
  maxRetries: number;
  backoffIntervals: number[];
  batchSize: number;
}

@Injectable()
export class RetryWorkerService {
  private readonly logger = new Logger(RetryWorkerService.name);
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    backoffIntervals: [1, 5, 15], // 1min, 5min, 15min
    batchSize: 100,
  };

  constructor(
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotificationDocument>,
    private readonly novuWorkflowService: NovuWorkflowService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly errorClassifierService: ErrorClassifierService,
    private readonly dlqService: DLQService,
    private readonly tokenCleanupService: TokenCleanupService,
  ) {}

  /**
   * Scheduled job to process failed notifications
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processFailedNotifications(): Promise<void> {
    try {
      this.logger.log('Starting retry worker for failed notifications');

      // Check if circuit breaker is open
      if ((this.circuitBreakerService as any).isCircuitOpen('novu-api')) {
        this.logger.warn('Circuit breaker is open for Novu API, skipping retry processing');
        return;
      }

      const failedNotifications = await this.getFailedNotifications();

      if (failedNotifications.length === 0) {
        this.logger.log('No failed notifications to retry');
        return;
      }

      this.logger.log(`Found ${failedNotifications.length} failed notifications to retry`);

      // Process notifications in batches
      const batches = this.createBatches(failedNotifications, this.retryConfig.batchSize);

      for (const batch of batches) {
        await this.processBatch(batch);
      }

      this.logger.log('Retry worker completed successfully');
    } catch (error) {
      this.logger.error('Error in retry worker:', error);
    }
  }

  /**
   * Get failed notifications that are eligible for retry
   */
  private async getFailedNotifications(): Promise<UserNotificationDocument[]> {
    const now = new Date();

    return this.userNotificationModel
      .find({
        status: NotificationStatus.FAILED,
        retryCount: { $lt: this.retryConfig.maxRetries },
        $or: [
          { updatedAt: { $lte: new Date(now.getTime() - this.getRetryDelay(0) * 60000) } },
          { updatedAt: { $lte: new Date(now.getTime() - this.getRetryDelay(1) * 60000) } },
          { updatedAt: { $lte: new Date(now.getTime() - this.getRetryDelay(2) * 60000) } },
        ],
      })
      .sort({ priority: 1, createdAt: 1 }) // Process urgent first, then by creation time
      .limit(this.retryConfig.batchSize)
      .exec();
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of failed notifications
   */
  private async processBatch(notifications: UserNotificationDocument[]): Promise<void> {
    const promises = notifications.map((notification) => this.retryNotification(notification));

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      this.logger.error('Error processing batch:', error);
    }
  }

  /**
   * Retry a single notification
   */
  private async retryNotification(notification: UserNotificationDocument): Promise<void> {
    const correlationId = this.generateCorrelationId();

    try {
      this.logger.log(
        `Retrying notification ${notification.id} (attempt ${notification.retryCount + 1})`,
        {
          correlationId,
          notificationId: notification.id,
          userId: notification.userId,
          retryCount: notification.retryCount,
        },
      );

      // Update retry count
      await this.userNotificationModel.updateOne(
        { id: notification.id },
        {
          $inc: { retryCount: 1 },
          $set: {
            status: NotificationStatus.PENDING,
            updatedAt: new Date(),
          },
        },
      );

      // Re-trigger Novu workflow
      await (this.novuWorkflowService as any).triggerWorkflow({
        workflowId: notification.data.workflowId || 'default-push-workflow',
        recipients: [notification.userId],
        payload: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          notificationId: notification.id,
        },
      });

      // Mark as sent
      await this.userNotificationModel.updateOne(
        { id: notification.id },
        {
          $set: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );

      this.logger.log(`Notification ${notification.id} retried successfully`, {
        correlationId,
        notificationId: notification.id,
      });
    } catch (error) {
      this.logger.error(`Failed to retry notification ${notification.id}:`, {
        correlationId,
        notificationId: notification.id,
        error: error.message,
        stack: error.stack,
      });

      // Classify error to determine retry strategy
      const errorClassification = (this.errorClassifierService as any).classifyError(error);

      this.logger.log(`Error classification for notification ${notification.id}:`, {
        correlationId,
        notificationId: notification.id,
        errorType: errorClassification.type,
        shouldRetry: errorClassification.shouldRetry,
        shouldCleanupToken: errorClassification.shouldCleanupToken,
        shouldMoveToDLQ: errorClassification.shouldMoveToDLQ,
      });

      // Handle token cleanup if needed
      if (errorClassification.shouldCleanupToken) {
        await this.cleanupInvalidToken(notification, error);
      }

      // Update error information
      await this.userNotificationModel.updateOne(
        { id: notification.id },
        {
          $set: {
            status: NotificationStatus.FAILED,
            errorMessage: errorClassification.userFriendlyMessage,
            errorCode: this.extractErrorCode(error),
            updatedAt: new Date(),
          },
        },
      );

      // Determine if should move to DLQ
      const shouldMoveToDLQ =
        errorClassification.shouldMoveToDLQ ||
        notification.retryCount + 1 >= this.retryConfig.maxRetries;

      if (shouldMoveToDLQ) {
        await this.moveToDeadLetterQueue(notification, error);
      }
    }
  }

  /**
   * Cleanup invalid device token
   */
  private async cleanupInvalidToken(
    notification: UserNotificationDocument,
    error: Error,
  ): Promise<void> {
    try {
      this.logger.warn(`Cleaning up invalid token for notification ${notification.id}`, {
        notificationId: notification.id,
        userId: notification.userId,
        error: error.message,
      });

      // Cleanup invalid token using token cleanup service
      await (this.tokenCleanupService as any).cleanupInvalidToken(
        notification.userId,
        error,
        ErrorType.TOKEN_INVALID,
      );

      this.logger.log(`Token cleanup completed for notification ${notification.id}`);
    } catch (cleanupError) {
      this.logger.error(
        `Failed to cleanup token for notification ${notification.id}:`,
        cleanupError,
      );
    }
  }

  /**
   * Move notification to Dead Letter Queue
   */
  private async moveToDeadLetterQueue(
    notification: UserNotificationDocument,
    error: Error,
  ): Promise<void> {
    try {
      this.logger.warn(`Moving notification ${notification.id} to DLQ after max retries exceeded`, {
        notificationId: notification.id,
        retryCount: notification.retryCount,
        error: error.message,
      });

      // Update notification with DLQ status
      await this.userNotificationModel.updateOne(
        { id: notification.id },
        {
          $set: {
            status: 'dlq', // Custom status for DLQ
            errorMessage: `Max retries exceeded: ${error.message}`,
            errorCode: 'MAX_RETRIES_EXCEEDED',
            updatedAt: new Date(),
          },
        },
      );

      // Move to DLQ using DLQ service
      await (this.dlqService as any).addToDLQ(notification, error);
    } catch (dlqError) {
      this.logger.error(`Failed to move notification ${notification.id} to DLQ:`, dlqError);
    }
  }

  /**
   * Get retry delay based on retry count
   */
  private getRetryDelay(retryCount: number): number {
    if (retryCount >= this.retryConfig.backoffIntervals.length) {
      return this.retryConfig.backoffIntervals[this.retryConfig.backoffIntervals.length - 1];
    }
    return this.retryConfig.backoffIntervals[retryCount];
  }

  /**
   * Extract error code from error object
   */
  private extractErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.status) return `HTTP_${error.status}`;
    if (error.name) return error.name;
    return 'UNKNOWN_ERROR';
  }

  /**
   * Generate correlation ID for tracing
   */
  private generateCorrelationId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Manual retry for specific notification (admin use)
   */
  async manualRetry(notificationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const notification = await this.userNotificationModel.findOne({ id: notificationId });

      if (!notification) {
        return { success: false, message: 'Notification not found' };
      }

      if (notification.status !== NotificationStatus.FAILED) {
        return { success: false, message: 'Notification is not in failed or DLQ status' };
      }

      // Reset retry count for manual retry
      await this.userNotificationModel.updateOne(
        { id: notificationId },
        {
          $set: {
            retryCount: 0,
            status: NotificationStatus.PENDING,
            errorMessage: null,
            errorCode: null,
            updatedAt: new Date(),
          },
        },
      );

      // Process the retry
      await this.retryNotification(notification);

      return { success: true, message: 'Notification retry initiated' };
    } catch (error) {
      this.logger.error(`Manual retry failed for notification ${notificationId}:`, error);
      return { success: false, message: `Retry failed: ${error.message}` };
    }
  }

  /**
   * Get retry statistics
   */
  async getRetryStatistics(): Promise<{
    totalFailed: number;
    pendingRetry: number;
    dlqCount: number;
    retrySuccessRate: number;
  }> {
    const [totalFailed, pendingRetry, dlqCount, retrySuccess] = await Promise.all([
      this.userNotificationModel.countDocuments({ status: NotificationStatus.FAILED }),
      this.userNotificationModel.countDocuments({
        status: NotificationStatus.FAILED,
        retryCount: { $lt: this.retryConfig.maxRetries },
      }),
      this.userNotificationModel.countDocuments({ status: 'dlq' }),
      this.userNotificationModel.countDocuments({
        status: NotificationStatus.SENT,
        retryCount: { $gt: 0 },
      }),
    ]);

    const totalRetries = await this.userNotificationModel.countDocuments({
      retryCount: { $gt: 0 },
    });

    const retrySuccessRate = totalRetries > 0 ? (retrySuccess / totalRetries) * 100 : 0;

    return {
      totalFailed,
      pendingRetry,
      dlqCount,
      retrySuccessRate: Math.round(retrySuccessRate * 100) / 100,
    };
  }
}
