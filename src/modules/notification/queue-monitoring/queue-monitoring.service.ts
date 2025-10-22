import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { PrometheusService } from '../../../infrastructure/monitoring/prometheus.service';
import { Injectable, Get, Res, Logger } from '@nestjs/common';

export interface QueueStatus {
  queueName: string;
  messageCount: number;
  consumerCount: number;
  processingRate: number;
  averageProcessingTime: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  lastProcessedAt?: Date;
  errorRate: number;
  priority: 'high' | 'normal' | 'low';
}

export interface QueueMetrics {
  totalProcessed: number;
  totalFailed: number;
  successRate: number;
  averageProcessingTime: number;
  queueLength: number;
  processingRate: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  lastProcessedAt?: Date;
  priorityBreakdown: {
    high: number;
    normal: number;
    low: number;
  };
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  failureThreshold: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  successCount: number;
  successThreshold: number;
}

@Injectable()
export class QueueMonitoringService {
  private readonly logger = new Logger(QueueMonitoringService.name);
  private readonly circuitBreakerStates = new Map<string, CircuitBreakerState>();

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly redisService: RedisService,
    private readonly prometheusService: PrometheusService,
  ) {
    this.initializeCircuitBreakers();
  }

  private initializeCircuitBreakers(): void {
    const queues = [
      'notification.high',
      'notification.normal',
      'notification.low',
      'notification.retry',
      'notification.dlq.new',
    ];

    queues.forEach((queueName) => {
      this.circuitBreakerStates.set(queueName, {
        state: 'closed',
        failureCount: 0,
        failureThreshold: 5,
        successCount: 0,
        successThreshold: 3,
      });
    });
  }

  async getQueueStatus(queueName: string): Promise<QueueStatus> {
    try {
      const connection = await this.rabbitMQService.getConnection();
      const channel = await connection.createChannel();

      // Get queue info
      const queueInfo = await channel.checkQueue(queueName);

      // Get consumer count
      const consumerCount = queueInfo.consumerCount;
      const messageCount = queueInfo.messageCount;

      // Get metrics from Redis
      const metrics = await this.getQueueMetricsFromRedis(queueName);

      // Get circuit breaker state
      const circuitBreakerState = this.getCircuitBreakerState(queueName);

      await channel.close();

      return {
        queueName,
        messageCount,
        consumerCount,
        processingRate: metrics.processingRate,
        averageProcessingTime: metrics.averageProcessingTime,
        circuitBreakerState: circuitBreakerState.state,
        lastProcessedAt: metrics.lastProcessedAt,
        errorRate: metrics.totalFailed / (metrics.totalProcessed + metrics.totalFailed) || 0,
        priority: this.getQueuePriority(queueName),
      };
    } catch (error) {
      this.logger.error(`Failed to get queue status for ${queueName}:`, error);
      throw error;
    }
  }

  async getAllQueuesStatus(): Promise<QueueStatus[]> {
    const queues = [
      'notification.high',
      'notification.normal',
      'notification.low',
      'notification.retry',
      'notification.dlq.new',
    ];

    const statuses = await Promise.allSettled(
      queues.map((queueName) => this.getQueueStatus(queueName)),
    );

    return statuses
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<QueueStatus>).value);
  }

  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    try {
      const metrics = await this.getQueueMetricsFromRedis(queueName);
      const circuitBreakerState = this.getCircuitBreakerState(queueName);

      // Get priority breakdown
      const priorityBreakdown = await this.getPriorityBreakdown(queueName);

      return {
        totalProcessed: metrics.totalProcessed,
        totalFailed: metrics.totalFailed,
        successRate: metrics.totalProcessed / (metrics.totalProcessed + metrics.totalFailed) || 0,
        averageProcessingTime: metrics.averageProcessingTime,
        queueLength: metrics.queueLength,
        processingRate: metrics.processingRate,
        circuitBreakerState: circuitBreakerState.state,
        lastProcessedAt: metrics.lastProcessedAt,
        priorityBreakdown,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue metrics for ${queueName}:`, error);
      throw error;
    }
  }

  async getOverallMetrics(): Promise<{
    totalQueues: number;
    totalMessages: number;
    totalProcessed: number;
    totalFailed: number;
    overallSuccessRate: number;
    averageProcessingTime: number;
    circuitBreakerStates: Record<string, string>;
  }> {
    try {
      const queues = [
        'notification.high',
        'notification.normal',
        'notification.low',
        'notification.retry',
        'notification.dlq.new',
      ];

      const allMetrics = await Promise.allSettled(
        queues.map((queueName) => this.getQueueMetrics(queueName)),
      );

      const successfulMetrics = allMetrics
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<QueueMetrics>).value);

      const totalProcessed = successfulMetrics.reduce(
        (sum, metrics) => sum + metrics.totalProcessed,
        0,
      );
      const totalFailed = successfulMetrics.reduce((sum, metrics) => sum + metrics.totalFailed, 0);
      const totalMessages = successfulMetrics.reduce(
        (sum, metrics) => sum + metrics.queueLength,
        0,
      );

      const averageProcessingTime =
        successfulMetrics.length > 0
          ? successfulMetrics.reduce((sum, metrics) => sum + metrics.averageProcessingTime, 0) /
            successfulMetrics.length
          : 0;

      const circuitBreakerStates: Record<string, string> = {};
      queues.forEach((queueName) => {
        const state = this.getCircuitBreakerState(queueName);
        circuitBreakerStates[queueName] = state.state;
      });

      return {
        totalQueues: queues.length,
        totalMessages,
        totalProcessed,
        totalFailed,
        overallSuccessRate: totalProcessed / (totalProcessed + totalFailed) || 0,
        averageProcessingTime,
        circuitBreakerStates,
      };
    } catch (error) {
      this.logger.error('Failed to get overall metrics:', error);
      throw error;
    }
  }

  async getAlerts(): Promise<{
    warnings: string[];
    critical: string[];
    thresholds: {
      queueLengthWarning: number;
      queueLengthCritical: number;
      successRateWarning: number;
    };
  }> {
    const warnings: string[] = [];
    const critical: string[] = [];
    const thresholds = {
      queueLengthWarning: 1000,
      queueLengthCritical: 5000,
      successRateWarning: 0.95,
    };

    const queues = [
      'notification.high',
      'notification.normal',
      'notification.low',
      'notification.retry',
      'notification.dlq.new',
    ];

    for (const queueName of queues) {
      const metrics = await this.getQueueMetrics(queueName);
      // Queue length alerts
      if (metrics.queueLength > thresholds.queueLengthCritical) {
        critical.push(
          `${queueName}: queue length ${metrics.queueLength} > ${thresholds.queueLengthCritical}`,
        );
      } else if (metrics.queueLength > thresholds.queueLengthWarning) {
        warnings.push(
          `${queueName}: queue length ${metrics.queueLength} > ${thresholds.queueLengthWarning}`,
        );
      }
      // Success rate alerts
      if (metrics.successRate < thresholds.successRateWarning) {
        warnings.push(
          `${queueName}: success rate ${(metrics.successRate * 100).toFixed(2)}% < ${(thresholds.successRateWarning * 100).toFixed(0)}%`,
        );
      }
      // Circuit breaker alerts
      if (metrics.circuitBreakerState !== 'closed') {
        warnings.push(`${queueName}: circuit breaker is ${metrics.circuitBreakerState}`);
      }
    }

    return { warnings, critical, thresholds };
  }

  async recordMessageProcessed(
    queueName: string,
    processingTime: number,
    success: boolean,
  ): Promise<void> {
    try {
      const key = `queue:metrics:${queueName}`;
      const now = Date.now();

      // Update metrics in Redis
      await this.redisService.hincrby(key, 'totalProcessed', 1);
      if (!success) {
        await this.redisService.hincrby(key, 'totalFailed', 1);
      }

      // Update processing time
      const currentAvgTime = await this.redisService.hget(key, 'averageProcessingTime');
      const currentCount = await this.redisService.hget(key, 'totalProcessed');

      if (currentAvgTime && currentCount) {
        const newAvgTime =
          (parseFloat(currentAvgTime) * parseInt(currentCount) + processingTime) /
          (parseInt(currentCount) + 1);
        await this.redisService.hset(key, 'averageProcessingTime', newAvgTime.toString());
      } else {
        await this.redisService.hset(key, 'averageProcessingTime', processingTime.toString());
      }

      // Update last processed time
      await this.redisService.hset(key, 'lastProcessedAt', now.toString());

      // Update circuit breaker
      this.updateCircuitBreaker(queueName, success);

      // Update Prometheus metrics
      this.prometheusService.recordMessageProcessingDuration(
        queueName,
        'notification',
        processingTime,
      );
      this.prometheusService.recordNotificationSent(
        'notification',
        'queue',
        success ? 'success' : 'failed',
      );

      this.logger.debug(
        `Recorded message processed for ${queueName}: success=${success}, time=${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(`Failed to record message processed for ${queueName}:`, error);
    }
  }

  async updateQueueLength(queueName: string, length: number): Promise<void> {
    try {
      const key = `queue:metrics:${queueName}`;
      await this.redisService.hset(key, 'queueLength', length.toString());

      // Update Prometheus metrics
      this.prometheusService.setMessageQueueSize(queueName, length);

      this.logger.debug(`Updated queue length for ${queueName}: ${length}`);
    } catch (error) {
      this.logger.error(`Failed to update queue length for ${queueName}:`, error);
    }
  }

  private async getQueueMetricsFromRedis(queueName: string): Promise<{
    totalProcessed: number;
    totalFailed: number;
    averageProcessingTime: number;
    queueLength: number;
    processingRate: number;
    lastProcessedAt?: Date;
  }> {
    const key = `queue:metrics:${queueName}`;
    const metrics = await this.redisService.hgetall(key);

    return {
      totalProcessed: parseInt(metrics.totalProcessed || '0'),
      totalFailed: parseInt(metrics.totalFailed || '0'),
      averageProcessingTime: parseFloat(metrics.averageProcessingTime || '0'),
      queueLength: parseInt(metrics.queueLength || '0'),
      processingRate: parseFloat(metrics.processingRate || '0'),
      lastProcessedAt: metrics.lastProcessedAt
        ? new Date(parseInt(metrics.lastProcessedAt))
        : undefined,
    };
  }

  private async getPriorityBreakdown(
    queueName: string,
  ): Promise<{ high: number; normal: number; low: number }> {
    const key = `queue:priority:${queueName}`;
    const breakdown = await this.redisService.hgetall(key);

    return {
      high: parseInt(breakdown.high || '0'),
      normal: parseInt(breakdown.normal || '0'),
      low: parseInt(breakdown.low || '0'),
    };
  }

  private getQueuePriority(queueName: string): 'high' | 'normal' | 'low' {
    if (queueName.includes('high')) return 'high';
    if (queueName.includes('low')) return 'low';
    return 'normal';
  }

  private getCircuitBreakerState(queueName: string): CircuitBreakerState {
    return (
      this.circuitBreakerStates.get(queueName) || {
        state: 'closed',
        failureCount: 0,
        failureThreshold: 5,
        successCount: 0,
        successThreshold: 3,
      }
    );
  }

  private updateCircuitBreaker(queueName: string, success: boolean): void {
    const state = this.getCircuitBreakerState(queueName);
    const now = new Date();

    if (success) {
      if (state.state === 'half-open') {
        state.successCount++;
        if (state.successCount >= state.successThreshold) {
          state.state = 'closed';
          state.failureCount = 0;
          state.successCount = 0;
          this.logger.log(`Circuit breaker for ${queueName} closed after successful operations`);
        }
      } else if (state.state === 'open') {
        state.state = 'half-open';
        state.successCount = 1;
        state.nextAttemptTime = new Date(now.getTime() + 30000); // 30 seconds
        this.logger.log(`Circuit breaker for ${queueName} moved to half-open state`);
      }
    } else {
      state.failureCount++;
      state.lastFailureTime = now;

      if (state.state === 'closed' && state.failureCount >= state.failureThreshold) {
        state.state = 'open';
        state.nextAttemptTime = new Date(now.getTime() + 60000); // 1 minute
        this.logger.warn(`Circuit breaker for ${queueName} opened due to failures`);
      } else if (state.state === 'half-open') {
        state.state = 'open';
        state.nextAttemptTime = new Date(now.getTime() + 60000); // 1 minute
        this.logger.warn(`Circuit breaker for ${queueName} opened from half-open state`);
      }
    }

    this.circuitBreakerStates.set(queueName, state);
  }

  async resetCircuitBreaker(queueName: string): Promise<void> {
    const state = this.getCircuitBreakerState(queueName);
    state.state = 'closed';
    state.failureCount = 0;
    state.successCount = 0;
    state.lastFailureTime = undefined;
    state.nextAttemptTime = undefined;

    this.circuitBreakerStates.set(queueName, state);
    this.logger.log(`Circuit breaker for ${queueName} manually reset`);
  }

  async getCircuitBreakerStates(): Promise<Record<string, CircuitBreakerState>> {
    const states: Record<string, CircuitBreakerState> = {};
    this.circuitBreakerStates.forEach((state, queueName) => {
      states[queueName] = { ...state };
    });
    return states;
  }
}
