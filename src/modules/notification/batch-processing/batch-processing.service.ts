import { RedisService } from '../../../infrastructure/cache/redis.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { PrometheusService } from '../../../infrastructure/monitoring/prometheus.service';
import { Injectable, Res, Logger } from '@nestjs/common';

export interface BatchNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  priority: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  deduplicationKey?: string;
}

export interface BatchProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  duplicates: number;
  processingTime: number;
  batchId: string;
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  originalMessageId?: string;
  deduplicationKey: string;
}

@Injectable()
export class BatchProcessingService {
  private readonly logger = new Logger(BatchProcessingService.name);
  private readonly batchSize = parseInt(process.env.BATCH_SIZE || '100');
  private readonly maxBatchSize = parseInt(process.env.MAX_BATCH_SIZE || '1000');
  private readonly deduplicationTtl = parseInt(process.env.DEDUPLICATION_TTL || '3600'); // 1 hour

  constructor(
    private readonly redisService: RedisService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly prometheusService: PrometheusService,
    // private readonly structuredLogger: StructuredLoggerService,
  ) {}

  async processBatch(notifications: BatchNotification[]): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const batchId = this.generateBatchId();

    this.logger.log(`Starting batch processing for ${notifications.length} notifications`, {
      batchId,
      batchSize: notifications.length,
    });

    try {
      // Validate batch size
      if (notifications.length > this.maxBatchSize) {
        throw new Error(
          `Batch size ${notifications.length} exceeds maximum allowed size ${this.maxBatchSize}`,
        );
      }

      // Process deduplication
      const deduplicationResults = await this.processDeduplication(notifications);
      const uniqueNotifications = notifications.filter(
        (_, index) => !deduplicationResults[index].isDuplicate,
      );
      const duplicates = notifications.length - uniqueNotifications.length;

      // Group by priority
      const groupedNotifications = this.groupByPriority(uniqueNotifications);

      // Process each priority group
      let successful = 0;
      let failed = 0;

      for (const [priority, group] of Object.entries(groupedNotifications)) {
        const result = await this.processPriorityGroup(
          priority as 'high' | 'normal' | 'low',
          group,
          batchId,
        );
        successful += result.successful;
        failed += result.failed;
      }

      const processingTime = Date.now() - startTime;

      const result: BatchProcessingResult = {
        totalProcessed: notifications.length,
        successful,
        failed,
        duplicates,
        processingTime,
        batchId,
      };

      // Log batch processing result
      // this.structuredLogger.logBusinessEvent('batch_processing_completed', {
      //   batchId,
      //   totalProcessed: result.totalProcessed,
      //   successful: result.successful,
      //   failed: result.failed,
      //   duplicates: result.duplicates,
      //   processingTime: result.processingTime,
      // });

      // Update Prometheus metrics
      this.prometheusService.recordNotificationSent('batch', 'queue', 'success');
      this.prometheusService.recordNotificationProcessingDuration(
        'batch',
        'queue',
        processingTime / 1000,
      );

      this.logger.log(`Batch processing completed`, {
        batchId,
        result,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`Batch processing failed for batch ${batchId}:`, error);

      // this.structuredLogger.logBusinessEvent('batch_processing_failed', {
      //   batchId,
      //   error: error.message,
      //   processingTime,
      // });

      throw error;
    }
  }

  private async processDeduplication(
    notifications: BatchNotification[],
  ): Promise<DeduplicationResult[]> {
    const results: DeduplicationResult[] = [];

    for (const notification of notifications) {
      const deduplicationKey =
        notification.deduplicationKey || this.generateDeduplicationKey(notification);
      const result = await this.checkDeduplication(deduplicationKey);
      results.push(result);
    }

    return results;
  }

  private async checkDeduplication(deduplicationKey: string): Promise<DeduplicationResult> {
    try {
      const key = `dedup:${deduplicationKey}`;
      const existingMessageId = await this.redisService.get(key);

      if (existingMessageId) {
        return {
          isDuplicate: true,
          originalMessageId: existingMessageId,
          deduplicationKey,
        };
      }

      // Store the deduplication key with a TTL
      const messageId = this.generateMessageId();
      await this.redisService.set(key, messageId, this.deduplicationTtl);

      return {
        isDuplicate: false,
        deduplicationKey,
      };
    } catch (error) {
      this.logger.error(`Deduplication check failed for key ${deduplicationKey}:`, error);
      // If deduplication fails, allow the message to proceed
      return {
        isDuplicate: false,
        deduplicationKey,
      };
    }
  }

  private groupByPriority(notifications: BatchNotification[]): Record<string, BatchNotification[]> {
    return notifications.reduce(
      (groups, notification) => {
        const priority = notification.priority;
        if (!groups[priority]) {
          groups[priority] = [];
        }
        groups[priority].push(notification);
        return groups;
      },
      {} as Record<string, BatchNotification[]>,
    );
  }

  private async processPriorityGroup(
    priority: 'high' | 'normal' | 'low',
    notifications: BatchNotification[],
    batchId: string,
  ): Promise<{ successful: number; failed: number }> {
    const queueName = `notification.${priority}`;
    let successful = 0;
    let failed = 0;

    try {
      // Process in smaller chunks to avoid overwhelming the queue
      const chunks = this.chunkArray(notifications, this.batchSize);

      for (const chunk of chunks) {
        const result = await this.publishChunkToQueue(queueName, chunk, batchId);
        successful += result.successful;
        failed += result.failed;
      }

      this.logger.debug(`Processed ${priority} priority group`, {
        batchId,
        queueName,
        total: notifications.length,
        successful,
        failed,
      });

      return { successful, failed };
    } catch (error) {
      this.logger.error(
        `Failed to process ${priority} priority group for batch ${batchId}:`,
        error,
      );
      return { successful, failed: notifications.length };
    }
  }

  private async publishChunkToQueue(
    queueName: string,
    notifications: BatchNotification[],
    batchId: string,
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    try {
      const connection = await this.rabbitMQService.getConnection();
      const channel = await connection.createChannel();

      await channel.assertQueue(queueName, { durable: true });

      for (const notification of notifications) {
        try {
          const message = {
            ...notification,
            batchId,
            timestamp: new Date().toISOString(),
          };

          await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
            persistent: true,
            priority: this.getPriorityValue(notification.priority),
          });

          successful++;
        } catch (error) {
          this.logger.error(`Failed to publish notification to queue ${queueName}:`, error);
          failed++;
        }
      }

      await channel.close();
    } catch (error) {
      this.logger.error(`Failed to publish chunk to queue ${queueName}:`, error);
      failed += notifications.length;
    }

    return { successful, failed };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private getPriorityValue(priority: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high':
        return 10;
      case 'normal':
        return 5;
      case 'low':
        return 1;
      default:
        return 5;
    }
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDeduplicationKey(notification: BatchNotification): string {
    const keyData = {
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
    };
    return `dedup_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  async getBatchStatistics(): Promise<{
    totalBatches: number;
    totalNotifications: number;
    averageBatchSize: number;
    successRate: number;
    averageProcessingTime: number;
  }> {
    try {
      const stats = await this.redisService.hgetall('batch:statistics');

      return {
        totalBatches: parseInt(stats.totalBatches || '0'),
        totalNotifications: parseInt(stats.totalNotifications || '0'),
        averageBatchSize: parseFloat(stats.averageBatchSize || '0'),
        successRate: parseFloat(stats.successRate || '0'),
        averageProcessingTime: parseFloat(stats.averageProcessingTime || '0'),
      };
    } catch (error) {
      this.logger.error('Failed to get batch statistics:', error);
      return {
        totalBatches: 0,
        totalNotifications: 0,
        averageBatchSize: 0,
        successRate: 0,
        averageProcessingTime: 0,
      };
    }
  }

  async updateBatchStatistics(result: BatchProcessingResult): Promise<void> {
    try {
      const key = 'batch:statistics';

      // Update total batches
      await this.redisService.hincrby(key, 'totalBatches', 1);

      // Update total notifications
      await this.redisService.hincrby(key, 'totalNotifications', result.totalProcessed);

      // Update success rate (rolling average)
      const currentStats = await this.redisService.hgetall(key);
      const currentSuccessRate = parseFloat(currentStats.successRate || '0');
      const currentBatches = parseInt(currentStats.totalBatches || '0');
      const newSuccessRate =
        (currentSuccessRate * (currentBatches - 1) + result.successful / result.totalProcessed) /
        currentBatches;
      await this.redisService.hset(key, 'successRate', newSuccessRate.toString());

      // Update average batch size
      const currentAvgSize = parseFloat(currentStats.averageBatchSize || '0');
      const newAvgSize =
        (currentAvgSize * (currentBatches - 1) + result.totalProcessed) / currentBatches;
      await this.redisService.hset(key, 'averageBatchSize', newAvgSize.toString());

      // Update average processing time
      const currentAvgTime = parseFloat(currentStats.averageProcessingTime || '0');
      const newAvgTime =
        (currentAvgTime * (currentBatches - 1) + result.processingTime) / currentBatches;
      await this.redisService.hset(key, 'averageProcessingTime', newAvgTime.toString());

      this.logger.debug('Updated batch statistics', { result });
    } catch (error) {
      this.logger.error('Failed to update batch statistics:', error);
    }
  }
}
