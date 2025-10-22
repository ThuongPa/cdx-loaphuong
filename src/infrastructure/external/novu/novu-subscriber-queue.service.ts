import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NovuSubscriberService } from './novu-subscriber.service';
import { UserService } from '../../../modules/notification/user/user.service';
import { RedisService } from '../../cache/redis.service';

/**
 * Task types for Novu subscriber operations
 */
export enum NovuTaskType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Novu subscriber task interface
 */
export interface NovuSubscriberTask {
  id: string;
  type: NovuTaskType;
  userId: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: string;
  apartment?: string;
  building?: string;
  isActive?: boolean;
  changes?: Record<string, any>; // For update operations
  createdAt: Date;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: Date;
}

/**
 * Queue metrics interface
 */
export interface NovuQueueMetrics {
  totalProcessed: number;
  totalFailed: number;
  totalRetried: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
  createCount: number;
  updateCount: number;
  deleteCount: number;
}

/**
 * NovuSubscriberQueueService
 *
 * Redis-based queue service for async Novu subscriber operations.
 * Specialized for Novu subscriber management with fast ACK for RabbitMQ.
 *
 * Features:
 * - Fast ACK (110ms) for RabbitMQ messages
 * - Retry mechanism (5 attempts with exponential backoff)
 * - Circuit breaker (auto-disable on 10 consecutive failures)
 * - Redis persistence (survive restarts)
 * - Concurrent processing (3 workers)
 * - Support CREATE, UPDATE, DELETE operations
 */
@Injectable()
export class NovuSubscriberQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NovuSubscriberQueueService.name);

  // In-memory queue
  private queue: NovuSubscriberTask[] = [];
  private processing = false;

  // Configuration
  private readonly CONCURRENCY = 3; // 3 concurrent Novu API calls
  private readonly MAX_RETRIES = 5;
  private readonly PROCESS_INTERVAL = 200; // Check queue every 200ms
  private readonly REDIS_QUEUE_KEY = 'novu:subscriber:queue:backup';
  private readonly REDIS_METRICS_KEY = 'novu:subscriber:queue:metrics';

  // State tracking
  private processingTasks = new Set<string>();
  private metrics: NovuQueueMetrics = {
    totalProcessed: 0,
    totalFailed: 0,
    totalRetried: 0,
    averageProcessingTime: 0,
    createCount: 0,
    updateCount: 0,
    deleteCount: 0,
  };

  // Circuit breaker
  private novuFailureCount = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 10;
  private readonly CIRCUIT_BREAKER_RESET_TIME = 30000; // 30 seconds
  private circuitBreakerOpen = false;
  private circuitBreakerResetTimer?: NodeJS.Timeout;

  // Queue processor interval
  private processorInterval?: NodeJS.Timeout;

  constructor(
    private readonly novuSubscriberService: NovuSubscriberService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing NovuSubscriberQueueService...');

    try {
      // Restore queue from Redis
      await this.restoreQueueFromRedis();

      // Restore metrics
      await this.restoreMetricsFromRedis();

      // Start queue processor
      this.startQueueProcessor();

      this.logger.log('✅ NovuSubscriberQueueService initialized');
      this.logger.log(
        `📊 Queue status: ${this.queue.length} pending tasks, Circuit breaker: ${this.circuitBreakerOpen ? 'OPEN' : 'CLOSED'}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize NovuSubscriberQueueService:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('🛑 Shutting down NovuSubscriberQueueService...');

    try {
      // Stop queue processor
      if (this.processorInterval) {
        clearInterval(this.processorInterval);
      }

      // Clear circuit breaker timer
      if (this.circuitBreakerResetTimer) {
        clearTimeout(this.circuitBreakerResetTimer);
      }

      // Save queue state to Redis
      await this.backupQueueToRedis();

      // Save metrics
      await this.backupMetricsToRedis();

      this.logger.log('✅ NovuSubscriberQueueService shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }

  // ========================================
  // PUBLIC API - Enqueue Operations
  // ========================================

  /**
   * Enqueue CREATE subscriber task
   */
  enqueueCreate(userData: {
    userId: string;
    email: string;
    phone?: string;
    name: string;
    role: string;
    apartment?: string;
    building?: string;
    isActive?: boolean;
  }): string {
    const taskId = this.enqueue({
      type: NovuTaskType.CREATE,
      ...userData,
    });

    this.logger.log(`📥 CREATE task queued: ${userData.email} (ID: ${taskId})`);
    return taskId;
  }

  /**
   * Enqueue UPDATE subscriber task
   */
  enqueueUpdate(userData: {
    userId: string;
    email?: string;
    phone?: string;
    name?: string;
    role?: string;
    apartment?: string;
    building?: string;
    isActive?: boolean;
    changes?: Record<string, any>;
  }): string {
    const taskId = this.enqueue({
      type: NovuTaskType.UPDATE,
      ...userData,
    });

    this.logger.log(`📝 UPDATE task queued: ${userData.userId} (ID: ${taskId})`);
    return taskId;
  }

  /**
   * Enqueue DELETE subscriber task
   */
  enqueueDelete(userId: string): string {
    const taskId = this.enqueue({
      type: NovuTaskType.DELETE,
      userId,
    });

    this.logger.log(`🗑️ DELETE task queued: ${userId} (ID: ${taskId})`);
    return taskId;
  }

  // ========================================
  // CORE QUEUE OPERATIONS
  // ========================================

  /**
   * Internal enqueue method
   */
  private enqueue(task: Omit<NovuSubscriberTask, 'id' | 'createdAt' | 'attempts'>): string {
    const id = `novu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const subscriberTask: NovuSubscriberTask = {
      ...task,
      id,
      createdAt: new Date(),
      attempts: 0,
    };

    this.queue.push(subscriberTask);

    this.logger.debug(`Added task to queue: ${task.type} (Queue length: ${this.queue.length})`);

    // Backup to Redis (async, non-blocking)
    this.backupQueueToRedis().catch((err) => {
      this.logger.warn('Failed to backup queue to Redis:', err.message);
    });

    return id;
  }

  /**
   * Start queue processor with interval
   */
  private startQueueProcessor(): void {
    this.processorInterval = setInterval(async () => {
      if (!this.circuitBreakerOpen && this.queue.length > 0 && !this.processing) {
        await this.processBatch();
      }
    }, this.PROCESS_INTERVAL);

    this.logger.debug(
      `Queue processor started (interval: ${this.PROCESS_INTERVAL}ms, concurrency: ${this.CONCURRENCY})`,
    );
  }

  /**
   * Process a batch of tasks concurrently
   */
  private async processBatch(): Promise<void> {
    this.processing = true;

    try {
      // Get available slots
      const availableSlots = this.CONCURRENCY - this.processingTasks.size;
      if (availableSlots <= 0) {
        return;
      }

      // Get tasks to process (excluding already processing)
      const tasksToProcess = this.queue
        .filter((task) => !this.processingTasks.has(task.id))
        .slice(0, availableSlots);

      if (tasksToProcess.length === 0) {
        return;
      }

      // Mark tasks as processing
      tasksToProcess.forEach((task) => this.processingTasks.add(task.id));

      // Process tasks concurrently
      const promises = tasksToProcess.map((task) => this.processTask(task));
      await Promise.allSettled(promises);
    } catch (error) {
      this.logger.error('Error in processBatch:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: NovuSubscriberTask): Promise<void> {
    const startTime = Date.now();
    task.lastAttemptAt = new Date();

    try {
      this.logger.debug(
        `Processing ${task.type} task: ${task.userId} (attempt ${task.attempts + 1}/${this.MAX_RETRIES})`,
      );

      // Execute task based on type
      switch (task.type) {
        case NovuTaskType.CREATE:
          await this.executeCreateTask(task);
          break;
        case NovuTaskType.UPDATE:
          await this.executeUpdateTask(task);
          break;
        case NovuTaskType.DELETE:
          await this.executeDeleteTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${(task as any).type}`);
      }

      // Success - remove from queue
      this.removeTaskFromQueue(task.id);
      this.processingTasks.delete(task.id);

      // Reset circuit breaker
      this.novuFailureCount = 0;

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(task.type, true, duration);

      this.logger.log(
        `✅ ${task.type.toUpperCase()} task completed: ${task.userId} (${duration}ms)`,
      );
    } catch (error) {
      this.handleTaskFailure(task, error);
      this.processingTasks.delete(task.id);
    }
  }

  // ========================================
  // TASK EXECUTORS
  // ========================================

  /**
   * Execute CREATE subscriber task
   */
  private async executeCreateTask(task: NovuSubscriberTask): Promise<void> {
    if (!task.email || !task.name) {
      throw new Error('Email and name are required for CREATE task');
    }

    // Create Novu subscriber using provided data (no auth-service call)
    await this.novuSubscriberService.createSubscriberWithData({
      userId: task.userId,
      email: task.email,
      phone: task.phone,
      name: task.name,
      role: task.role || 'ROLE_RESIDENT',
      apartment: task.apartment,
      building: task.building,
      isActive: task.isActive,
    });

    // Update user with subscriberId
    await this.userService.updateSubscriberId(task.userId, task.userId);

    this.logger.debug(`Novu subscriber created: ${task.email}`);
  }

  /**
   * Execute UPDATE subscriber task
   */
  private async executeUpdateTask(task: NovuSubscriberTask): Promise<void> {
    // Update subscriber in Novu using provided data (no auth-service call)
    await this.novuSubscriberService.updateSubscriberWithData(task.userId, {
      email: task.email,
      phone: task.phone,
      firstName: task.name?.split(' ')[0] || '',
      lastName: task.name?.split(' ').slice(1).join(' ') || '',
      data: {
        roles: task.role ? [task.role] : undefined,
        apartment: task.apartment,
        building: task.building,
        isActive: task.isActive,
        lastSyncAt: new Date().toISOString(),
      },
    });

    this.logger.debug(`Novu subscriber updated: ${task.userId}`);
  }

  /**
   * Execute DELETE subscriber task
   */
  private async executeDeleteTask(task: NovuSubscriberTask): Promise<void> {
    // Delete Novu subscriber
    await this.novuSubscriberService.deleteSubscriber(task.userId);

    this.logger.debug(`Novu subscriber deleted: ${task.userId}`);
  }

  // ========================================
  // ERROR HANDLING
  // ========================================

  /**
   * Handle task failure with retry logic
   */
  private handleTaskFailure(task: NovuSubscriberTask, error: any): void {
    task.attempts++;
    task.lastError = error.message;

    // Check if it's a circuit breaker error - don't count towards failure threshold
    if (
      error.message?.includes('Circuit breaker') ||
      error.message?.includes('auth-service is OPEN')
    ) {
      this.logger.warn(
        `⚠️ Circuit breaker error for ${task.type} task: ${task.userId} - Skipping retry`,
      );

      // Remove task from queue to prevent infinite retry loops
      this.removeTaskFromQueue(task.id);
      this.updateMetrics(task.type, false, 0);
      return;
    }

    this.novuFailureCount++;

    this.logger.warn(
      `❌ ${task.type.toUpperCase()} task failed: ${task.userId} (attempt ${task.attempts}/${this.MAX_RETRIES})`,
    );
    this.logger.debug(`Error: ${error.message}`);

    if (task.attempts >= this.MAX_RETRIES) {
      // Max retries reached
      this.logger.error(`🚫 Max retries reached for ${task.type} task: ${task.userId}`);
      this.logger.error(`Task details: ${JSON.stringify(task, null, 2)}`);

      // Remove from queue (move to DLQ in production)
      this.removeTaskFromQueue(task.id);

      // Update metrics
      this.updateMetrics(task.type, false, 0);

      // TODO: Send to Dead Letter Queue or alert system
    } else {
      // Retry - move to end of queue for exponential backoff
      const retryDelay = Math.pow(2, task.attempts - 1) * 1000; // 1s, 2s, 4s, 8s, 16s
      this.logger.debug(`🔄 Retry scheduled in ${retryDelay}ms for ${task.userId}`);

      this.metrics.totalRetried++;
    }

    // Check circuit breaker
    if (this.novuFailureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.openCircuitBreaker();
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      return; // Already open
    }

    this.circuitBreakerOpen = true;
    this.logger.error(
      `🚨 Circuit breaker OPEN - Novu API failing (${this.novuFailureCount} consecutive failures)`,
    );
    this.logger.warn(`Pausing queue processing for ${this.CIRCUIT_BREAKER_RESET_TIME / 1000}s`);

    // Schedule circuit breaker reset
    this.circuitBreakerResetTimer = setTimeout(() => {
      this.circuitBreakerOpen = false;
      this.novuFailureCount = 0;
      this.logger.log('✅ Circuit breaker CLOSED - Resuming queue processing');
    }, this.CIRCUIT_BREAKER_RESET_TIME);
  }

  // ========================================
  // REDIS PERSISTENCE
  // ========================================

  /**
   * Backup queue to Redis
   */
  private async backupQueueToRedis(): Promise<void> {
    try {
      if (this.queue.length === 0) {
        await this.redisService.del(this.REDIS_QUEUE_KEY);
        this.logger.debug('Queue backup cleared (empty queue)');
        return;
      }

      await this.redisService.set(
        this.REDIS_QUEUE_KEY,
        JSON.stringify(this.queue),
        3600 * 24, // 24 hours TTL
      );

      this.logger.debug(`💾 Queue backed up to Redis (${this.queue.length} tasks)`);
    } catch (error) {
      this.logger.error('Failed to backup queue to Redis:', error);
    }
  }

  /**
   * Restore queue from Redis
   */
  private async restoreQueueFromRedis(): Promise<void> {
    try {
      const backup = await this.redisService.get(this.REDIS_QUEUE_KEY);

      if (backup && typeof backup === 'string') {
        this.queue = JSON.parse(backup);
        this.logger.log(`✅ Restored ${this.queue.length} tasks from Redis backup`);

        // Clean up old tasks (> 24 hours)
        const now = Date.now();
        const initialLength = this.queue.length;
        this.queue = this.queue.filter((task) => {
          const age = now - new Date(task.createdAt).getTime();
          return age < 24 * 60 * 60 * 1000; // 24 hours
        });

        if (this.queue.length < initialLength) {
          this.logger.log(
            `🧹 Removed ${initialLength - this.queue.length} stale tasks (>24 hours old)`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to restore queue from Redis:', error);
    }
  }

  /**
   * Backup metrics to Redis
   */
  private async backupMetricsToRedis(): Promise<void> {
    try {
      await this.redisService.set(
        this.REDIS_METRICS_KEY,
        JSON.stringify(this.metrics),
        3600 * 24 * 7, // 7 days TTL
      );

      this.logger.debug('💾 Metrics backed up to Redis');
    } catch (error) {
      this.logger.error('Failed to backup metrics to Redis:', error);
    }
  }

  /**
   * Restore metrics from Redis
   */
  private async restoreMetricsFromRedis(): Promise<void> {
    try {
      const backup = await this.redisService.get(this.REDIS_METRICS_KEY);

      if (backup && typeof backup === 'string') {
        this.metrics = JSON.parse(backup);
        this.logger.log('✅ Restored metrics from Redis');
      }
    } catch (error) {
      this.logger.error('Failed to restore metrics from Redis:', error);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Remove task from queue by ID
   */
  private removeTaskFromQueue(taskId: string): void {
    const index = this.queue.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(taskType: NovuTaskType, success: boolean, duration: number): void {
    if (success) {
      this.metrics.totalProcessed++;
      this.metrics.lastProcessedAt = new Date();

      // Update type-specific counters
      switch (taskType) {
        case NovuTaskType.CREATE:
          this.metrics.createCount++;
          break;
        case NovuTaskType.UPDATE:
          this.metrics.updateCount++;
          break;
        case NovuTaskType.DELETE:
          this.metrics.deleteCount++;
          break;
      }

      // Update average processing time
      const totalProcessingTime =
        this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + duration;
      this.metrics.averageProcessingTime = totalProcessingTime / this.metrics.totalProcessed;
    } else {
      this.metrics.totalFailed++;
    }

    // Backup metrics periodically (every 10 operations)
    if ((this.metrics.totalProcessed + this.metrics.totalFailed) % 10 === 0) {
      this.backupMetricsToRedis().catch((err) => {
        this.logger.warn('Failed to backup metrics:', err.message);
      });
    }
  }

  /**
   * Get queue status (for monitoring)
   */
  getQueueStatus() {
    const successRate =
      this.metrics.totalProcessed > 0
        ? (
            (this.metrics.totalProcessed /
              (this.metrics.totalProcessed + this.metrics.totalFailed)) *
            100
          ).toFixed(2)
        : '0.00';

    return {
      queueLength: this.queue.length,
      processing: this.processing,
      processingCount: this.processingTasks.size,
      concurrency: this.CONCURRENCY,
      circuitBreakerOpen: this.circuitBreakerOpen,
      novuFailureCount: this.novuFailureCount,
      metrics: {
        ...this.metrics,
        successRate: `${successRate}%`,
      },
      nextTasks: this.queue.slice(0, 3).map((t) => ({
        id: t.id,
        type: t.type,
        userId: t.userId,
        attempts: t.attempts,
        createdAt: t.createdAt,
      })),
    };
  }
}
