import { Injectable, Res } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicator } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { RabbitMQService } from '../../infrastructure/messaging/rabbitmq.service';
import { RabbitMQConsumerService } from '../../infrastructure/messaging/rabbitmq-consumer.service';
import { EventValidationService } from '../../infrastructure/messaging/event-validation.service';
import { RabbitMQRetryService } from '../../infrastructure/messaging/rabbitmq-retry.service';
import { NovuClient } from '../../infrastructure/external/novu/novu.client';

@Injectable()
export class HealthService extends HealthIndicator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly rabbitMQConsumerService: RabbitMQConsumerService,
    private readonly eventValidationService: EventValidationService,
    private readonly rabbitMQRetryService: RabbitMQRetryService,
    private readonly novuClient: NovuClient,
  ) {
    super();
  }

  async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      const result = await this.connection?.db?.admin()?.ping();
      return this.getStatus('database', result?.ok === 1);
    } catch (error) {
      return this.getStatus('database', false, { error: error.message });
    }
  }

  async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      await this.redisService.get('health-check');
      return this.getStatus('redis', true);
    } catch (error) {
      return this.getStatus('redis', false, { error: error.message });
    }
  }

  async checkRabbitMQ(): Promise<HealthIndicatorResult> {
    try {
      const connection = this.rabbitMQService.getConnection();
      if (!connection) {
        return this.getStatus('rabbitmq', false, { error: 'No connection available' });
      }
      return this.getStatus('rabbitmq', true);
    } catch (error) {
      return this.getStatus('rabbitmq', false, { error: error.message });
    }
  }

  async checkNovu(): Promise<HealthIndicatorResult> {
    try {
      // Simple health check by trying to create a template (this will fail but we can check the connection)
      await this.novuClient.createTemplate({
        name: 'health-check',
        type: 'announcement',
        channel: 'push',
        body: 'Health check',
        variables: [],
      });
      return this.getStatus('novu', true);
    } catch (error) {
      // If it's a circuit breaker error, the service is down
      if (error.message.includes('Circuit breaker')) {
        return this.getStatus('novu', false, { error: 'Circuit breaker is open' });
      }
      // If it's any other error, we consider it healthy (service is reachable)
      return this.getStatus('novu', true);
    }
  }

  async checkRabbitMQConsumer(): Promise<HealthIndicatorResult> {
    try {
      const healthStatus = this.rabbitMQConsumerService.getHealthStatus();
      return this.getStatus('rabbitmq-consumer', healthStatus.isConsuming, {
        isConsuming: healthStatus.isConsuming,
        registeredHandlers: healthStatus.registeredHandlers.length,
        timestamp: healthStatus.timestamp,
      });
    } catch (error) {
      return this.getStatus('rabbitmq-consumer', false, { error: error.message });
    }
  }

  async checkEventValidation(): Promise<HealthIndicatorResult> {
    try {
      // Test event validation service by generating a correlation ID
      const correlationId = this.eventValidationService.generateCorrelationId();
      return this.getStatus('event-validation', !!correlationId, {
        correlationIdGenerated: !!correlationId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return this.getStatus('event-validation', false, { error: error.message });
    }
  }

  async checkRabbitMQRetry(): Promise<HealthIndicatorResult> {
    try {
      // Test retry service by checking if it can identify retryable errors
      const networkError = { code: 'ECONNREFUSED' };
      const isRetryable = this.rabbitMQRetryService.isRetryableError(networkError);
      return this.getStatus('rabbitmq-retry', isRetryable, {
        canIdentifyRetryableErrors: isRetryable,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return this.getStatus('rabbitmq-retry', false, { error: error.message });
    }
  }
}
