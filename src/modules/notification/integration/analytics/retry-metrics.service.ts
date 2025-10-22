import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { CircuitBreakerService } from '../../../../infrastructure/external/circuit-breaker/circuit-breaker.service';
import { ErrorClassifierService } from '../../../../common/services/error-classifier.service';
import { Injectable, Get, Logger } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../../infrastructure/database/schemas/user-notification.schema';

export interface RetryMetrics {
  totalNotifications: number;
  failedNotifications: number;
  retryAttempts: number;
  successfulRetries: number;
  dlqEntries: number;
  failureRate: number;
  retrySuccessRate: number;
  circuitBreakerStatus: Record<string, any>;
  errorClassifications: Record<string, number>;
  hourlyStats: Array<{
    hour: string;
    total: number;
    failed: number;
    retried: number;
    success: number;
  }>;
}

export interface AlertThresholds {
  failureRateThreshold: number; // Default 5%
  retrySuccessRateThreshold: number; // Default 80%
  dlqEntriesThreshold: number; // Default 100
  circuitBreakerOpenThreshold: number; // Default 1
}

@Injectable()
export class RetryMetricsService {
  private readonly logger = new Logger(RetryMetricsService.name);
  private readonly defaultThresholds: AlertThresholds = {
    failureRateThreshold: 5, // 5%
    retrySuccessRateThreshold: 80, // 80%
    dlqEntriesThreshold: 100,
    circuitBreakerOpenThreshold: 1,
  };

  constructor(
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotificationDocument>,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly errorClassifierService: ErrorClassifierService,
  ) {}

  /**
   * Get comprehensive retry metrics
   */
  async getRetryMetrics(timeRangeHours: number = 24): Promise<RetryMetrics> {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - timeRangeHours);

      const [
        totalNotifications,
        failedNotifications,
        retryAttempts,
        successfulRetries,
        dlqEntries,
        errorClassifications,
        hourlyStats,
      ] = await Promise.all([
        this.getTotalNotifications(startTime),
        this.getFailedNotifications(startTime),
        this.getRetryAttempts(startTime),
        this.getSuccessfulRetries(startTime),
        this.getDLQEntries(),
        this.getErrorClassifications(startTime),
        this.getHourlyStats(startTime),
      ]);

      const failureRate =
        totalNotifications > 0 ? (failedNotifications / totalNotifications) * 100 : 0;
      const retrySuccessRate = retryAttempts > 0 ? (successfulRetries / retryAttempts) * 100 : 0;
      const circuitBreakerStatus = this.circuitBreakerService.getAllCircuitMetrics();

      return {
        totalNotifications,
        failedNotifications,
        retryAttempts,
        successfulRetries,
        dlqEntries,
        failureRate: Math.round(failureRate * 100) / 100,
        retrySuccessRate: Math.round(retrySuccessRate * 100) / 100,
        circuitBreakerStatus,
        errorClassifications,
        hourlyStats,
      };
    } catch (error) {
      this.logger.error('Failed to get retry metrics:', error);
      throw error;
    }
  }

  /**
   * Check if metrics exceed alert thresholds
   */
  async checkAlertThresholds(thresholds: Partial<AlertThresholds> = {}): Promise<{
    alerts: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      currentValue: number;
      threshold: number;
    }>;
    shouldAlert: boolean;
  }> {
    try {
      const mergedThresholds = { ...this.defaultThresholds, ...thresholds };
      const metrics = await this.getRetryMetrics(1); // Last hour
      const alerts: Array<{
        type: string;
        message: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        currentValue: number;
        threshold: number;
      }> = [];

      // Check failure rate
      if (metrics.failureRate > mergedThresholds.failureRateThreshold) {
        const severity = this.getSeverity(
          metrics.failureRate,
          mergedThresholds.failureRateThreshold,
        );
        alerts.push({
          type: 'HIGH_FAILURE_RATE',
          message: `Notification failure rate is ${metrics.failureRate}%, exceeding threshold of ${mergedThresholds.failureRateThreshold}%`,
          severity,
          currentValue: metrics.failureRate,
          threshold: mergedThresholds.failureRateThreshold,
        });
      }

      // Check retry success rate
      if (metrics.retrySuccessRate < mergedThresholds.retrySuccessRateThreshold) {
        const severity = this.getSeverity(
          mergedThresholds.retrySuccessRateThreshold - metrics.retrySuccessRate,
          mergedThresholds.retrySuccessRateThreshold * 0.1,
        );
        alerts.push({
          type: 'LOW_RETRY_SUCCESS_RATE',
          message: `Retry success rate is ${metrics.retrySuccessRate}%, below threshold of ${mergedThresholds.retrySuccessRateThreshold}%`,
          severity,
          currentValue: metrics.retrySuccessRate,
          threshold: mergedThresholds.retrySuccessRateThreshold,
        });
      }

      // Check DLQ entries
      if (metrics.dlqEntries > mergedThresholds.dlqEntriesThreshold) {
        const severity = this.getSeverity(metrics.dlqEntries, mergedThresholds.dlqEntriesThreshold);
        alerts.push({
          type: 'HIGH_DLQ_ENTRIES',
          message: `Dead Letter Queue has ${metrics.dlqEntries} entries, exceeding threshold of ${mergedThresholds.dlqEntriesThreshold}`,
          severity,
          currentValue: metrics.dlqEntries,
          threshold: mergedThresholds.dlqEntriesThreshold,
        });
      }

      // Check circuit breaker status
      const openCircuits = Object.values(metrics.circuitBreakerStatus).filter(
        (circuit: any) => circuit.isOpen,
      ).length;
      if (openCircuits >= mergedThresholds.circuitBreakerOpenThreshold) {
        alerts.push({
          type: 'CIRCUIT_BREAKER_OPEN',
          message: `${openCircuits} circuit breaker(s) are open`,
          severity: 'critical',
          currentValue: openCircuits,
          threshold: mergedThresholds.circuitBreakerOpenThreshold,
        });
      }

      return {
        alerts,
        shouldAlert: alerts.length > 0,
      };
    } catch (error) {
      this.logger.error('Failed to check alert thresholds:', error);
      throw error;
    }
  }

  /**
   * Get correlation ID for request tracing
   */
  generateCorrelationId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log retry attempt with correlation ID
   */
  logRetryAttempt(
    correlationId: string,
    notificationId: string,
    attempt: number,
    success: boolean,
    error?: any,
  ): void {
    const logData = {
      correlationId,
      notificationId,
      attempt,
      success,
      timestamp: new Date().toISOString(),
    };

    if (success) {
      this.logger.log(`Retry attempt successful`, logData);
    } else {
      this.logger.warn(`Retry attempt failed`, {
        ...logData,
        error: error?.message,
        errorCode: error?.code,
      });
    }
  }

  /**
   * Get total notifications in time range
   */
  private async getTotalNotifications(startTime: Date): Promise<number> {
    return this.userNotificationModel.countDocuments({
      createdAt: { $gte: startTime },
    });
  }

  /**
   * Get failed notifications in time range
   */
  private async getFailedNotifications(startTime: Date): Promise<number> {
    return this.userNotificationModel.countDocuments({
      status: 'failed',
      updatedAt: { $gte: startTime },
    });
  }

  /**
   * Get retry attempts in time range
   */
  private async getRetryAttempts(startTime: Date): Promise<number> {
    return this.userNotificationModel.countDocuments({
      retryCount: { $gt: 0 },
      updatedAt: { $gte: startTime },
    });
  }

  /**
   * Get successful retries in time range
   */
  private async getSuccessfulRetries(startTime: Date): Promise<number> {
    return this.userNotificationModel.countDocuments({
      status: 'sent',
      retryCount: { $gt: 0 },
      sentAt: { $gte: startTime },
    });
  }

  /**
   * Get DLQ entries count
   */
  private async getDLQEntries(): Promise<number> {
    return this.userNotificationModel.countDocuments({
      status: 'dlq',
    });
  }

  /**
   * Get error classifications in time range
   */
  private async getErrorClassifications(startTime: Date): Promise<Record<string, number>> {
    const pipeline = [
      {
        $match: {
          status: 'failed',
          updatedAt: { $gte: startTime },
          errorCode: { $exists: true },
        },
      },
      { $group: { _id: '$errorCode', count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ];

    const result = await this.userNotificationModel.aggregate(pipeline);
    return result.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get hourly statistics
   */
  private async getHourlyStats(startTime: Date): Promise<
    Array<{
      hour: string;
      total: number;
      failed: number;
      retried: number;
      success: number;
    }>
  > {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: {
            hour: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } },
          },
          total: { $sum: 1 },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0],
            },
          },
          retried: {
            $sum: {
              $cond: [{ $gt: ['$retryCount', 0] }, 1, 0],
            },
          },
          success: {
            $sum: {
              $cond: [{ $eq: ['$status', 'sent'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { '_id.hour': 1 as const } },
    ];

    const result = await this.userNotificationModel.aggregate(pipeline);
    return result.map((item) => ({
      hour: item._id.hour,
      total: item.total,
      failed: item.failed,
      retried: item.retried,
      success: item.success,
    }));
  }

  /**
   * Determine alert severity based on threshold breach
   */
  private getSeverity(
    currentValue: number,
    threshold: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = currentValue / threshold;

    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Get performance metrics for monitoring dashboard
   */
  async getPerformanceMetrics(): Promise<{
    averageRetryTime: number;
    retryDistribution: Record<string, number>;
    errorTrends: Array<{
      date: string;
      errors: number;
      retries: number;
    }>;
  }> {
    try {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const [retryDistribution, errorTrends] = await Promise.all([
        this.getRetryDistribution(),
        this.getErrorTrends(last7Days),
      ]);

      // Calculate average retry time (simplified)
      const averageRetryTime = await this.calculateAverageRetryTime();

      return {
        averageRetryTime,
        retryDistribution,
        errorTrends,
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get retry distribution by attempt count
   */
  private async getRetryDistribution(): Promise<Record<string, number>> {
    const pipeline = [
      { $match: { retryCount: { $gt: 0 } } },
      { $group: { _id: '$retryCount', count: { $sum: 1 } } },
      { $sort: { _id: 1 as const } },
    ];

    const result = await this.userNotificationModel.aggregate(pipeline);
    return result.reduce(
      (acc, item) => {
        acc[`attempt_${item._id}`] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get error trends over time
   */
  private async getErrorTrends(startTime: Date): Promise<
    Array<{
      date: string;
      errors: number;
      retries: number;
    }>
  > {
    const pipeline = [
      {
        $match: {
          updatedAt: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          },
          errors: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0],
            },
          },
          retries: {
            $sum: {
              $cond: [{ $gt: ['$retryCount', 0] }, 1, 0],
            },
          },
        },
      },
      { $sort: { '_id.date': 1 as const } },
    ];

    const result = await this.userNotificationModel.aggregate(pipeline);
    return result.map((item) => ({
      date: item._id.date,
      errors: item.errors,
      retries: item.retries,
    }));
  }

  /**
   * Calculate average retry time (simplified implementation)
   */
  private async calculateAverageRetryTime(): Promise<number> {
    // This is a simplified implementation
    // In a real scenario, you'd track retry timing more precisely
    const retryNotifications = await this.userNotificationModel
      .find({
        retryCount: { $gt: 0 },
        sentAt: { $exists: true },
      })
      .select('createdAt sentAt retryCount')
      .limit(1000);

    if (retryNotifications.length === 0) return 0;

    const totalTime = retryNotifications.reduce((sum, notification) => {
      if (notification.sentAt) {
        const retryTime = notification.sentAt.getTime() - notification.createdAt.getTime();
        return sum + retryTime;
      }
      return sum;
    }, 0);

    return Math.round(totalTime / retryNotifications.length / 1000); // Return in seconds
  }
}
