import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { PrometheusService } from '../../../infrastructure/monitoring/prometheus.service';
import { Injectable, Get, Res, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Type } from 'class-transformer';
import * as amqp from 'amqplib';
import { StructuredLoggerService } from '../shared/services/structured-logger.service';
import { NovuClient } from '../../../infrastructure/external/novu/novu.client';

export interface PriorityMessage {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  retryCount?: number;
  maxRetries?: number;
}

export interface WorkerPoolStatus {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  queueLengths: Record<string, number>;
  processingRates: Record<string, number>;
}

@Injectable()
export class PriorityQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriorityQueueService.name);
  private readonly maxWorkers = parseInt(process.env.MAX_WORKERS || '5');
  private readonly workers: Map<string, amqp.Channel> = new Map();
  private readonly workerStatus = new Map<string, 'idle' | 'busy'>();
  private readonly queueNames = {
    main: 'priority.notification.queue',
    retry: 'priority.notification.retry.queue',
    dlq: 'priority.notification.dlq',
  };
  private isShuttingDown = false;
  private persistenceInterval: NodeJS.Timeout;

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly redisService: RedisService,
    private readonly prometheusService: PrometheusService,
    private readonly structuredLogger: StructuredLoggerService,
    private readonly novuClient: NovuClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeQueues();
    await this.initializeWorkerPool();
    await this.restoreQueueState();
    this.startPersistenceInterval();
    this.logger.log('Priority queue service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }

    await this.persistQueueState();
    await this.shutdownWorkerPool();
    this.logger.log('Priority queue service destroyed');
  }

  private async initializeQueues(): Promise<void> {
    try {
      const connection = await this.rabbitMQService.getConnection();
      const channel = await connection.createChannel();

      // Initialize all queues with proper configuration
      for (const [priority, queueName] of Object.entries(this.queueNames)) {
        try {
          await channel.assertQueue(queueName, {
            durable: true,
            arguments: {
              'x-max-priority': 15, // Support priority levels 0-15 for urgent/high/normal/low
              'x-message-ttl': priority === 'dlq' ? 86400000 : undefined, // 24 hours for DLQ
            },
          });

          this.logger.log(`Initialized queue: ${queueName}`);
        } catch (error) {
          // If it's a precondition failed error, the queue exists with different config
          if (error.code === 406) {
            this.logger.warn(
              `Queue ${queueName} exists with different configuration, using existing queue`,
            );
          } else {
            this.logger.error(`Failed to create queue ${queueName}:`, error);
            throw error;
          }
        }
      }

      await channel.close();
      this.logger.log('Priority notification queues initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize priority notification queues:', error);
      throw error;
    }
  }

  private async initializeWorkerPool(): Promise<void> {
    try {
      const connection = await this.rabbitMQService.getConnection();

      for (let i = 0; i < this.maxWorkers; i++) {
        const workerId = `worker-${i}`;
        const channel = await connection.createChannel();

        // Set prefetch count to 1 for better load balancing
        await channel.prefetch(1);

        this.workers.set(workerId, channel);
        this.workerStatus.set(workerId, 'idle');

        // Start consuming from all queues
        await this.startWorker(workerId, channel);
      }

      this.logger.log(`Initialized ${this.maxWorkers} workers`);
    } catch (error) {
      this.logger.error('Failed to initialize worker pool:', error);
      throw error;
    }
  }

  private async startWorker(workerId: string, channel: amqp.Channel): Promise<void> {
    try {
      // Consume from main notification queue (priority-based)
      await channel.consume(
        this.queueNames.main,
        async (msg: amqp.ConsumeMessage | null) => {
          if (msg) {
            await this.processMessage(workerId, channel, msg, 'main');
          }
        },
        { noAck: false },
      );

      // Consume from retry queue
      await channel.consume(
        this.queueNames.retry,
        async (msg: amqp.ConsumeMessage | null) => {
          if (msg) {
            await this.processMessage(workerId, channel, msg, 'retry');
          }
        },
        { noAck: false },
      );

      this.logger.debug(`Worker ${workerId} started consuming messages from priority queue`);
    } catch (error) {
      this.logger.error(`Failed to start worker ${workerId}:`, error);
    }
  }

  private async processMessage(
    workerId: string,
    channel: amqp.Channel,
    msg: amqp.ConsumeMessage,
    queueType: string,
  ): Promise<void> {
    const startTime = Date.now();
    this.workerStatus.set(workerId, 'busy');

    try {
      const message: PriorityMessage = JSON.parse(msg.content.toString());

      this.logger.debug(`Worker ${workerId} processing message from ${queueType} queue`, {
        messageId: message.id,
        userId: message.userId,
        type: message.type,
      });

      // Process the notification
      await this.handleNotification(message);

      // Acknowledge the message
      channel.ack(msg);

      const processingTime = Date.now() - startTime;

      // Update metrics
      this.prometheusService.recordMessageProcessingDuration(
        queueType,
        'notification',
        processingTime / 1000,
      );
      this.prometheusService.recordNotificationSent('notification', 'queue', 'success');

      this.structuredLogger.logMessageQueueOperation('processed', queueType, message.id, {
        // workerId,
        // processingTime,
        priority: message.priority,
      });

      this.logger.debug(`Worker ${workerId} completed processing message`, {
        messageId: message.id,
        processingTime,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`Worker ${workerId} failed to process message:`, error);

      // Handle retry logic
      await this.handleMessageFailure(channel, msg, error, processingTime);

      this.prometheusService.recordNotificationSent('notification', 'queue', 'failed');
    } finally {
      this.workerStatus.set(workerId, 'idle');
    }
  }

  private async handleNotification(message: PriorityMessage): Promise<void> {
    this.logger.debug(`Handling notification: ${message.id}`, {
      userId: message.userId,
      type: message.type,
      priority: message.priority,
    });

    try {
      // Send notification through Novu using dynamic workflow based on channels
      const channels = message.data?.channels || ['push'];
      await this.novuClient.triggerWorkflow({
        workflowId: this.novuClient.getWorkflowId(channels), // Dynamic workflow based on channel
        recipients: [message.userId], // User ID as subscriber ID
        payload: {
          title: message.title,
          body: message.body,
          channels: channels,
          data: message.data?.data || {},
          announcementId: message.data?.announcementId,
        },
      });

      this.logger.log(`Notification sent via Novu for user: ${message.userId}`, {
        messageId: message.id,
        priority: message.priority,
      });
    } catch (error) {
      this.logger.error(`Failed to send notification via Novu for user ${message.userId}:`, error);
      throw error; // Re-throw to trigger retry logic
    }
  }

  private async handleMessageFailure(
    channel: amqp.Channel,
    msg: amqp.ConsumeMessage,
    error: Error,
    processingTime: number,
  ): Promise<void> {
    try {
      const message: PriorityMessage = JSON.parse(msg.content.toString());
      const retryCount = (message.retryCount || 0) + 1;
      const maxRetries = message.maxRetries || 3;

      if (retryCount <= maxRetries) {
        // Retry the message
        const retryMessage = {
          ...message,
          retryCount,
        };

        await channel.sendToQueue(
          this.queueNames.retry,
          Buffer.from(JSON.stringify(retryMessage)),
          {
            persistent: true,
            priority: this.getPriorityValue(message.priority),
          },
        );

        channel.ack(msg);

        this.logger.warn(
          `Message ${message.id} sent to retry queue (attempt ${retryCount}/${maxRetries})`,
          {
            error: error.message,
            processingTime,
          },
        );
      } else {
        // Send to dead letter queue
        const dlqMessage = {
          ...message,
          retryCount,
          error: error.message,
          failedAt: new Date().toISOString(),
        };

        await channel.sendToQueue(this.queueNames.dlq, Buffer.from(JSON.stringify(dlqMessage)), {
          persistent: true,
        });

        channel.ack(msg);

        this.logger.error(
          `Message ${message.id} sent to dead letter queue after ${retryCount} attempts`,
          {
            error: error.message,
            processingTime,
          },
        );
      }
    } catch (retryError) {
      this.logger.error('Failed to handle message failure:', retryError);
      channel.nack(msg, false, false); // Reject and don't requeue
    }
  }

  private getPriorityValue(priority: 'urgent' | 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'urgent':
        return 15;
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

  /**
   * Enqueue a notification message to the priority queue
   */
  async enqueueNotification(message: PriorityMessage): Promise<void> {
    try {
      // Publish to single notification queue with priority
      const priorityValue = this.getPriorityValue(message.priority);

      // Use direct channel publish with priority
      await this.publishWithPriority(this.queueNames.main, message, priorityValue);

      this.logger.log(
        `Notification enqueued to ${this.queueNames.main} with priority ${priorityValue}`,
        {
          messageId: message.id,
          userId: message.userId,
          priority: message.priority,
          priorityValue,
        },
      );
    } catch (error) {
      this.logger.error('Failed to enqueue notification:', error);
      throw error;
    }
  }

  private async publishWithPriority(
    queueName: string,
    message: any,
    priority: number,
  ): Promise<void> {
    try {
      const connection = await this.rabbitMQService.getConnection();
      const channel = await connection.createChannel();

      const messageBuffer = Buffer.from(JSON.stringify(message));

      await channel.publish('', queueName, messageBuffer, {
        priority: priority,
        persistent: true,
      });

      await channel.close();
    } catch (error) {
      this.logger.error('Failed to publish message with priority:', error);
      throw error;
    }
  }

  async getWorkerPoolStatus(): Promise<WorkerPoolStatus> {
    try {
      const connection = await this.rabbitMQService.getConnection();
      const channel = await connection.createChannel();

      const queueLengths: Record<string, number> = {};
      const processingRates: Record<string, number> = {};

      for (const [priority, queueName] of Object.entries(this.queueNames)) {
        const queueInfo = await channel.checkQueue(queueName);
        queueLengths[queueName] = queueInfo.messageCount;

        // Get processing rate from Redis
        const rate = (await this.redisService.get(`queue:rate:${queueName}`)) || '0';
        processingRates[queueName] = parseFloat(rate);
      }

      await channel.close();

      const activeWorkers = Array.from(this.workerStatus.values()).filter(
        (status) => status === 'busy',
      ).length;
      const idleWorkers = this.maxWorkers - activeWorkers;

      return {
        totalWorkers: this.maxWorkers,
        activeWorkers,
        idleWorkers,
        queueLengths,
        processingRates,
      };
    } catch (error) {
      this.logger.error('Failed to get worker pool status:', error);
      throw error;
    }
  }

  private async restoreQueueState(): Promise<void> {
    try {
      const queueState = await this.redisService.get('queue:state:backup');
      if (queueState) {
        const state = JSON.parse(queueState);
        this.logger.log(`Restored queue state from backup`, {
          timestamp: state.timestamp,
          queues: Object.keys(state.queues),
        });
      }
    } catch (error) {
      this.logger.error('Failed to restore queue state:', error);
    }
  }

  private startPersistenceInterval(): void {
    this.persistenceInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.persistQueueState();
      }
    }, 30000); // Persist every 30 seconds
  }

  private async persistQueueState(): Promise<void> {
    try {
      const connection = await this.rabbitMQService.getConnection();
      const channel = await connection.createChannel();

      const queueState: any = {
        timestamp: new Date().toISOString(),
        queues: {},
      };

      for (const [priority, queueName] of Object.entries(this.queueNames)) {
        const queueInfo = await channel.checkQueue(queueName);
        queueState.queues[queueName] = {
          messageCount: queueInfo.messageCount,
          consumerCount: queueInfo.consumerCount,
        };
      }

      await channel.close();

      // Store in Redis with 24-hour TTL
      await this.redisService.set('queue:state:backup', JSON.stringify(queueState), 86400);

      this.logger.debug('Queue state persisted to Redis');
    } catch (error) {
      this.logger.error('Failed to persist queue state:', error);
    }
  }

  private async shutdownWorkerPool(): Promise<void> {
    try {
      for (const [workerId, channel] of this.workers) {
        await channel.close();
        this.logger.debug(`Worker ${workerId} closed`);
      }
      this.workers.clear();
      this.workerStatus.clear();
      this.logger.log('Worker pool shutdown completed');
    } catch (error) {
      this.logger.error('Failed to shutdown worker pool:', error);
    }
  }
}
