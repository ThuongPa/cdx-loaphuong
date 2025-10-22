import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../cache/redis.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { Injectable, Res, Logger } from '@nestjs/common';
// import { NovuService } from '../notification/novu.service';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    messageQueue: HealthCheck;
    notificationService: HealthCheck;
    system: HealthCheck;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
  error?: string;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectConnection() private readonly mongooseConnection: Connection,
    private readonly redisService: RedisService,
    private readonly rabbitMQService: RabbitMQService,
    // private readonly novuService: NovuService,
  ) {}

  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    const [databaseCheck, cacheCheck, messageQueueCheck, notificationServiceCheck, systemCheck] =
      await Promise.allSettled([
        this.checkDatabase(),
        this.checkCache(),
        this.checkMessageQueue(),
        this.checkNotificationService(),
        this.checkSystem(),
      ]);

    const checks = {
      database: this.getResult(databaseCheck),
      cache: this.getResult(cacheCheck),
      messageQueue: this.getResult(messageQueueCheck),
      notificationService: this.getResult(notificationServiceCheck),
      system: this.getResult(systemCheck),
    };

    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      uptime,
      checks,
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Check MongoDB connection
      const admin = this.mongooseConnection.db?.admin();
      await admin?.ping();

      // Check if we can perform a simple query
      const collections = (await this.mongooseConnection.db?.listCollections().toArray()) || [];

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          collections: collections.length,
          connectionState: this.mongooseConnection.readyState,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Database health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }
  }

  private async checkCache(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test Redis connection with a simple ping
      const testKey = 'health-check-test';
      const testValue = Date.now().toString();

      await this.redisService.set(testKey, testValue, 10); // 10 seconds TTL
      const retrievedValue = await this.redisService.get(testKey);
      await this.redisService.del(testKey);

      if (retrievedValue !== testValue) {
        throw new Error('Cache read/write test failed');
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          testPassed: true,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Cache health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }
  }

  private async checkMessageQueue(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Check RabbitMQ connection
      const connection = await this.rabbitMQService.getConnection();

      if (!connection) {
        throw new Error('RabbitMQ connection not available');
      }

      // Check if we can create a channel
      const channel = await connection.createChannel();
      await channel.close();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          connectionState: 'active',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Message queue health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }
  }

  private async checkNotificationService(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Check Novu service health
      // const healthStatus = await this.novuService.checkHealth();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy', // healthStatus ? 'healthy' : 'degraded',
        responseTime,
        details: {
          // novuStatus: healthStatus,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Notification service health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }
  }

  private async checkSystem(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Check memory usage (warn if > 80% of available memory)
      const totalMemory = require('os').totalmem();
      const memoryUsagePercent = (memUsage.heapUsed / totalMemory) * 100;

      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
      } else if (memoryUsagePercent > 80) {
        status = 'degraded';
      }

      const responseTime = Date.now() - startTime;

      return {
        status,
        responseTime,
        details: {
          memoryUsage: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external,
            usagePercent: memoryUsagePercent,
          },
          cpuUsage: {
            user: cpuUsage.user,
            system: cpuUsage.system,
          },
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('System health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }
  }

  private getResult(promiseResult: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (promiseResult.status === 'fulfilled') {
      return promiseResult.value;
    } else {
      return {
        status: 'unhealthy',
        responseTime: 0,
        error: promiseResult.reason?.message || 'Unknown error',
      };
    }
  }

  private determineOverallStatus(
    checks: HealthCheckResult['checks'],
  ): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map((check) => check.status);

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  // Liveness probe - simple check if the service is running
  async livenessCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  // Readiness probe - check if the service is ready to accept requests
  async readinessCheck(): Promise<{ status: string; timestamp: string; ready: boolean }> {
    const healthCheck = await this.performHealthCheck();

    return {
      status: healthCheck.status,
      timestamp: healthCheck.timestamp,
      ready: healthCheck.status === 'healthy' || healthCheck.status === 'degraded',
    };
  }
}
