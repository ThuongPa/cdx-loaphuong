import { PrometheusService } from '../monitoring/prometheus.service';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { StructuredLoggerService } from '../../modules/notification/shared/services/structured-logger.service';

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  propagateCreateError: boolean;
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalRequests: number;
  totalReleases: number;
  totalCreates: number;
  totalWaitTime?: number;
  totalConnectionTime?: number;
  totalDestroys: number;
  averageWaitTime: number;
  averageConnectionTime: number;
}

export interface PooledConnection {
  id: string;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
  metadata?: any;
}

@Injectable()
export class ConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private readonly pools = new Map<string, any>();
  private readonly stats = new Map<string, ConnectionPoolStats>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly structuredLogger: StructuredLoggerService,
  ) {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60000); // Every minute
  }

  async onModuleInit(): Promise<void> {
    await this.initializeDefaultPools();
    this.logger.log('Connection pool service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    await this.destroyAllPools();
    this.logger.log('Connection pool service destroyed');
  }

  private async initializeDefaultPools(): Promise<void> {
    // Initialize MongoDB connection pool
    await this.createPool('mongodb', {
      minConnections: parseInt(process.env.MONGODB_MIN_CONNECTIONS || '5'),
      maxConnections: parseInt(process.env.MONGODB_MAX_CONNECTIONS || '20'),
      acquireTimeoutMillis: parseInt(process.env.MONGODB_ACQUIRE_TIMEOUT || '30000'),
      createTimeoutMillis: parseInt(process.env.MONGODB_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.MONGODB_DESTROY_TIMEOUT || '5000'),
      idleTimeoutMillis: parseInt(process.env.MONGODB_IDLE_TIMEOUT || '300000'),
      reapIntervalMillis: parseInt(process.env.MONGODB_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.MONGODB_CREATE_RETRY_INTERVAL || '200'),
      propagateCreateError: false,
    });

    // Initialize Redis connection pool
    await this.createPool('redis', {
      minConnections: parseInt(process.env.REDIS_MIN_CONNECTIONS || '5'),
      maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '20'),
      acquireTimeoutMillis: parseInt(process.env.REDIS_ACQUIRE_TIMEOUT || '30000'),
      createTimeoutMillis: parseInt(process.env.REDIS_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.REDIS_DESTROY_TIMEOUT || '5000'),
      idleTimeoutMillis: parseInt(process.env.REDIS_IDLE_TIMEOUT || '300000'),
      reapIntervalMillis: parseInt(process.env.REDIS_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.REDIS_CREATE_RETRY_INTERVAL || '200'),
      propagateCreateError: false,
    });

    // Initialize RabbitMQ connection pool
    await this.createPool('rabbitmq', {
      minConnections: parseInt(process.env.RABBITMQ_MIN_CONNECTIONS || '3'),
      maxConnections: parseInt(process.env.RABBITMQ_MAX_CONNECTIONS || '10'),
      acquireTimeoutMillis: parseInt(process.env.RABBITMQ_ACQUIRE_TIMEOUT || '30000'),
      createTimeoutMillis: parseInt(process.env.RABBITMQ_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.RABBITMQ_DESTROY_TIMEOUT || '5000'),
      idleTimeoutMillis: parseInt(process.env.RABBITMQ_IDLE_TIMEOUT || '300000'),
      reapIntervalMillis: parseInt(process.env.RABBITMQ_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.RABBITMQ_CREATE_RETRY_INTERVAL || '200'),
      propagateCreateError: false,
    });
  }

  async createPool(name: string, config: ConnectionPoolConfig): Promise<void> {
    try {
      const pool = this.createGenericPool(name, config);
      this.pools.set(name, pool);

      // Initialize stats
      this.stats.set(name, {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        totalRequests: 0,
        totalReleases: 0,
        totalCreates: 0,
        totalDestroys: 0,
        averageWaitTime: 0,
        averageConnectionTime: 0,
      });

      this.logger.log(`Connection pool '${name}' created`, config);
    } catch (error) {
      this.logger.error(`Failed to create connection pool '${name}':`, error);
      throw error;
    }
  }

  private createGenericPool(name: string, config: ConnectionPoolConfig): any {
    // This is a simplified implementation
    // In a real implementation, you would use a proper connection pool library
    return {
      name,
      config,
      connections: new Map<string, PooledConnection>(),
      waitingQueue: [],
      stats: {
        totalRequests: 0,
        totalReleases: 0,
        totalCreates: 0,
        totalDestroys: 0,
        totalWaitTime: 0,
        totalConnectionTime: 0,
      },
    };
  }

  async acquireConnection(poolName: string): Promise<PooledConnection> {
    const startTime = Date.now();

    try {
      const pool = this.pools.get(poolName);
      if (!pool) {
        throw new Error(`Pool '${poolName}' not found`);
      }

      const stats = this.stats.get(poolName);
      if (!stats) {
        throw new Error(`Stats for pool '${poolName}' not found`);
      }

      stats.totalRequests++;
      stats.waitingClients++;

      // Simulate connection acquisition
      const connection = await this.createConnection(poolName);
      const waitTime = Date.now() - startTime;

      stats.totalWaitTime = (stats.totalWaitTime || 0) + waitTime;
      stats.averageWaitTime = (stats.totalWaitTime || 0) / stats.totalRequests;
      stats.activeConnections++;
      stats.waitingClients--;

      // Update Prometheus metrics
      this.prometheusService.recordConnectionPoolAcquisition(poolName, waitTime / 1000);

      this.logger.debug(`Connection acquired from pool '${poolName}'`, {
        connectionId: connection.id,
        waitTime,
      });

      return connection;
    } catch (error) {
      const stats = this.stats.get(poolName);
      if (stats) {
        stats.waitingClients--;
      }

      this.logger.error(`Failed to acquire connection from pool '${poolName}':`, error);
      throw error;
    }
  }

  async releaseConnection(poolName: string, connection: PooledConnection): Promise<void> {
    try {
      const pool = this.pools.get(poolName);
      if (!pool) {
        throw new Error(`Pool '${poolName}' not found`);
      }

      const stats = this.stats.get(poolName);
      if (!stats) {
        throw new Error(`Stats for pool '${poolName}' not found`);
      }

      stats.totalReleases++;
      stats.activeConnections--;
      stats.idleConnections++;

      // Update connection metadata
      connection.isActive = false;
      connection.lastUsed = new Date();

      // Update Prometheus metrics
      this.prometheusService.recordConnectionPoolRelease(poolName);

      this.logger.debug(`Connection released to pool '${poolName}'`, {
        connectionId: connection.id,
      });
    } catch (error) {
      this.logger.error(`Failed to release connection to pool '${poolName}':`, error);
      throw error;
    }
  }

  private async createConnection(poolName: string): Promise<PooledConnection> {
    const startTime = Date.now();

    try {
      const connection: PooledConnection = {
        id: `${poolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        lastUsed: new Date(),
        isActive: true,
        metadata: {
          poolName,
          created: new Date().toISOString(),
        },
      };

      const stats = this.stats.get(poolName);
      if (stats) {
        stats.totalCreates++;
        stats.totalConnections++;
        stats.idleConnections++;

        const connectionTime = Date.now() - startTime;
        stats.totalConnectionTime = (stats.totalConnectionTime || 0) + connectionTime;
        stats.averageConnectionTime = (stats.totalConnectionTime || 0) / stats.totalCreates;
      }

      // Update Prometheus metrics
      this.prometheusService.recordConnectionPoolCreation(
        poolName,
        (Date.now() - startTime) / 1000,
      );

      this.logger.debug(`Connection created for pool '${poolName}'`, {
        connectionId: connection.id,
        connectionTime: Date.now() - startTime,
      });

      return connection;
    } catch (error) {
      this.logger.error(`Failed to create connection for pool '${poolName}':`, error);
      throw error;
    }
  }

  async destroyConnection(poolName: string, connection: PooledConnection): Promise<void> {
    try {
      const pool = this.pools.get(poolName);
      if (!pool) {
        throw new Error(`Pool '${poolName}' not found`);
      }

      const stats = this.stats.get(poolName);
      if (!stats) {
        throw new Error(`Stats for pool '${poolName}' not found`);
      }

      stats.totalDestroys++;
      stats.totalConnections--;

      if (connection.isActive) {
        stats.activeConnections--;
      } else {
        stats.idleConnections--;
      }

      // Update Prometheus metrics
      this.prometheusService.recordConnectionPoolDestruction(poolName);

      this.logger.debug(`Connection destroyed for pool '${poolName}'`, {
        connectionId: connection.id,
      });
    } catch (error) {
      this.logger.error(`Failed to destroy connection for pool '${poolName}':`, error);
      throw error;
    }
  }

  getPoolStats(poolName: string): ConnectionPoolStats | null {
    return this.stats.get(poolName) || null;
  }

  getAllPoolsStats(): Record<string, ConnectionPoolStats> {
    const allStats: Record<string, ConnectionPoolStats> = {};
    this.stats.forEach((stats, poolName) => {
      allStats[poolName] = { ...stats };
    });
    return allStats;
  }

  async resizePool(poolName: string, newSize: number): Promise<void> {
    try {
      const pool = this.pools.get(poolName);
      if (!pool) {
        throw new Error(`Pool '${poolName}' not found`);
      }

      const currentSize = pool.config.maxConnections;
      pool.config.maxConnections = newSize;

      this.logger.log(`Pool '${poolName}' resized from ${currentSize} to ${newSize} connections`);

      // Log pool resize event
      this.structuredLogger.logBusinessEvent('connection_pool_resized', {
        poolName,
        oldSize: currentSize,
        newSize,
      });
    } catch (error) {
      this.logger.error(`Failed to resize pool '${poolName}':`, error);
      throw error;
    }
  }

  async getPoolHealth(poolName: string): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const stats = this.stats.get(poolName);
      if (!stats) {
        return {
          healthy: false,
          issues: ['Pool not found'],
          recommendations: ['Create the pool first'],
        };
      }

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check connection utilization
      const utilization = stats.activeConnections / stats.totalConnections;
      if (utilization > 0.8) {
        issues.push('High connection utilization');
        recommendations.push('Consider increasing max connections');
      }

      // Check wait time
      if (stats.averageWaitTime > 1000) {
        issues.push('High average wait time');
        recommendations.push(
          'Consider increasing min connections or optimizing connection creation',
        );
      }

      // Check waiting clients
      if (stats.waitingClients > 0) {
        issues.push('Clients waiting for connections');
        recommendations.push('Consider increasing max connections or optimizing connection usage');
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to get pool health for '${poolName}':`, error);
      return {
        healthy: false,
        issues: ['Failed to check pool health'],
        recommendations: ['Check pool configuration'],
      };
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      for (const [poolName, pool] of this.pools) {
        await this.cleanupIdleConnections(poolName, pool);
      }
    } catch (error) {
      this.logger.error('Failed to perform connection pool cleanup:', error);
    }
  }

  private async cleanupIdleConnections(poolName: string, pool: any): Promise<void> {
    try {
      const stats = this.stats.get(poolName);
      if (!stats) {
        return;
      }

      const now = Date.now();
      const idleTimeout = pool.config.idleTimeoutMillis;
      let cleanedCount = 0;

      // This is a simplified cleanup - in a real implementation,
      // you would iterate through actual connections
      if (stats.idleConnections > pool.config.minConnections) {
        const excessConnections = stats.idleConnections - pool.config.minConnections;
        cleanedCount = Math.min(excessConnections, 1); // Clean up one at a time

        stats.idleConnections -= cleanedCount;
        stats.totalConnections -= cleanedCount;
        stats.totalDestroys += cleanedCount;
      }

      if (cleanedCount > 0) {
        this.logger.debug(`Cleaned up ${cleanedCount} idle connections from pool '${poolName}'`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup idle connections for pool '${poolName}':`, error);
    }
  }

  private async destroyAllPools(): Promise<void> {
    try {
      for (const [poolName, pool] of this.pools) {
        await this.destroyPool(poolName);
      }
      this.pools.clear();
      this.stats.clear();
      this.logger.log('All connection pools destroyed');
    } catch (error) {
      this.logger.error('Failed to destroy all pools:', error);
    }
  }

  private async destroyPool(poolName: string): Promise<void> {
    try {
      const pool = this.pools.get(poolName);
      if (!pool) {
        return;
      }

      // In a real implementation, you would properly close all connections
      this.pools.delete(poolName);
      this.stats.delete(poolName);

      this.logger.log(`Pool '${poolName}' destroyed`);
    } catch (error) {
      this.logger.error(`Failed to destroy pool '${poolName}':`, error);
    }
  }
}
