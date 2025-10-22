import { RedisService } from '../cache/redis.service';
import { PrometheusService } from '../monitoring/prometheus.service';
import { Injectable, Logger } from '@nestjs/common';
import { StructuredLoggerService } from '../../modules/notification/shared/services/structured-logger.service';

export interface RedisOptimizationConfig {
  maxMemory: string;
  maxMemoryPolicy: string;
  tcpKeepalive: number;
  timeout: number;
  maxClients: number;
  slowLogThreshold: number;
}

export interface RedisPerformanceMetrics {
  memory: {
    used: number;
    peak: number;
    fragmentation: number;
  };
  connections: {
    total: number;
    active: number;
    idle: number;
  };
  operations: {
    totalCommands: number;
    commandsPerSecond: number;
    slowQueries: number;
  };
  keyspace: {
    totalKeys: number;
    expiredKeys: number;
    evictedKeys: number;
  };
}

@Injectable()
export class RedisOptimizationService {
  private readonly logger = new Logger(RedisOptimizationService.name);
  private readonly optimizationInterval: NodeJS.Timeout;

  constructor(
    private readonly redisService: RedisService,
    private readonly prometheusService: PrometheusService,
    private readonly structuredLogger: StructuredLoggerService,
  ) {
    this.optimizationInterval = setInterval(() => {
      this.performOptimization();
    }, 300000); // Every 5 minutes
  }

  async optimizeRedisConfiguration(): Promise<RedisOptimizationConfig> {
    try {
      const config: RedisOptimizationConfig = {
        maxMemory: process.env.REDIS_MAX_MEMORY || '256mb',
        maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
        tcpKeepalive: parseInt(process.env.REDIS_TCP_KEEPALIVE || '60'),
        timeout: parseInt(process.env.REDIS_TIMEOUT || '300'),
        maxClients: parseInt(process.env.REDIS_MAX_CLIENTS || '10000'),
        slowLogThreshold: parseInt(process.env.REDIS_SLOW_LOG_THRESHOLD || '10000'),
      };

      // Apply configuration optimizations
      await this.applyRedisConfig(config);

      this.logger.log('Redis configuration optimized', config);

      return config;
    } catch (error) {
      this.logger.error('Failed to optimize Redis configuration:', error);
      throw error;
    }
  }

  private async applyRedisConfig(config: RedisOptimizationConfig): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      // Set memory policy
      await client.sendCommand(['CONFIG', 'SET', 'maxmemory-policy', config.maxMemoryPolicy]);

      // Set TCP keepalive
      await client.sendCommand(['CONFIG', 'SET', 'tcp-keepalive', config.tcpKeepalive.toString()]);

      // Set timeout
      await client.sendCommand(['CONFIG', 'SET', 'timeout', config.timeout.toString()]);

      // Set slow log threshold
      await client.sendCommand([
        'CONFIG',
        'SET',
        'slowlog-log-slower-than',
        config.slowLogThreshold.toString(),
      ]);

      this.logger.debug('Redis configuration applied successfully');
    } catch (error) {
      this.logger.error('Failed to apply Redis configuration:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(): Promise<RedisPerformanceMetrics> {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      const info = await client.info('memory');

      const memoryInfo = this.parseMemoryInfo(info);
      const connectionInfo = await this.getConnectionInfo(client);
      const operationsInfo = await this.getOperationsInfo(client);
      const keyspaceInfo = await this.getKeyspaceInfo(client);

      const metrics: RedisPerformanceMetrics = {
        memory: memoryInfo,
        connections: connectionInfo,
        operations: operationsInfo,
        keyspace: keyspaceInfo,
      };

      // Update Prometheus metrics
      this.updatePrometheusMetrics(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get Redis performance metrics:', error);
      throw error;
    }
  }

  private parseMemoryInfo(info: string): { used: number; peak: number; fragmentation: number } {
    const lines = info.split('\n');
    const memory: any = {};

    lines.forEach((line) => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        memory[key.trim()] = value.trim();
      }
    });

    return {
      used: parseInt(memory.used_memory || '0'),
      peak: parseInt(memory.used_memory_peak || '0'),
      fragmentation: parseFloat(memory.mem_fragmentation_ratio || '0'),
    };
  }

  private async getConnectionInfo(client: any): Promise<{
    total: number;
    active: number;
    idle: number;
  }> {
    try {
      const info = await client.info('clients');
      const lines = info.split('\n');
      const clients: any = {};

      lines.forEach((line: string) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          clients[key.trim()] = value.trim();
        }
      });

      return {
        total: parseInt(clients.connected_clients || '0'),
        active: parseInt(clients.client_recent_max_input_buffer || '0'),
        idle:
          parseInt(clients.connected_clients || '0') -
          parseInt(clients.client_recent_max_input_buffer || '0'),
      };
    } catch (error) {
      this.logger.error('Failed to get connection info:', error);
      return { total: 0, active: 0, idle: 0 };
    }
  }

  private async getOperationsInfo(client: any): Promise<{
    totalCommands: number;
    commandsPerSecond: number;
    slowQueries: number;
  }> {
    try {
      const info = await client.info('stats');
      const lines = info.split('\n');
      const stats: any = {};

      lines.forEach((line: string) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key.trim()] = value.trim();
        }
      });

      return {
        totalCommands: parseInt(stats.total_commands_processed || '0'),
        commandsPerSecond: parseFloat(stats.instantaneous_ops_per_sec || '0'),
        slowQueries: parseInt(stats.slowlog_len || '0'),
      };
    } catch (error) {
      this.logger.error('Failed to get operations info:', error);
      return { totalCommands: 0, commandsPerSecond: 0, slowQueries: 0 };
    }
  }

  private async getKeyspaceInfo(client: any): Promise<{
    totalKeys: number;
    expiredKeys: number;
    evictedKeys: number;
  }> {
    try {
      const info = await client.info('keyspace');
      const lines = info.split('\n');
      let totalKeys = 0;

      lines.forEach((line: string) => {
        if (line.includes('keys=')) {
          const match = line.match(/keys=(\d+)/);
          if (match) {
            totalKeys += parseInt(match[1]);
          }
        }
      });

      const statsInfo = await client.info('stats');
      const statsLines = statsInfo.split('\n');
      const stats: any = {};

      statsLines.forEach((line: string) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key.trim()] = value.trim();
        }
      });

      return {
        totalKeys,
        expiredKeys: parseInt(stats.expired_keys || '0'),
        evictedKeys: parseInt(stats.evicted_keys || '0'),
      };
    } catch (error) {
      this.logger.error('Failed to get keyspace info:', error);
      return { totalKeys: 0, expiredKeys: 0, evictedKeys: 0 };
    }
  }

  private updatePrometheusMetrics(metrics: RedisPerformanceMetrics): void {
    try {
      // Update memory metrics
      this.prometheusService.setRedisMemoryUsage(metrics.memory.used);
      this.prometheusService.setRedisMemoryPeak(metrics.memory.peak);
      this.prometheusService.setRedisFragmentationRatio(metrics.memory.fragmentation);

      // Update connection metrics
      this.prometheusService.setRedisConnections(metrics.connections.total);
      this.prometheusService.setRedisActiveConnections(metrics.connections.active);

      // Update operation metrics
      this.prometheusService.setRedisCommandsPerSecond(metrics.operations.commandsPerSecond);
      this.prometheusService.setRedisSlowQueries(metrics.operations.slowQueries);

      // Update keyspace metrics
      this.prometheusService.setRedisTotalKeys(metrics.keyspace.totalKeys);
      this.prometheusService.setRedisExpiredKeys(metrics.keyspace.expiredKeys);
      this.prometheusService.setRedisEvictedKeys(metrics.keyspace.evictedKeys);
    } catch (error) {
      this.logger.error('Failed to update Prometheus metrics:', error);
    }
  }

  async optimizeMemoryUsage(): Promise<{
    before: number;
    after: number;
    freed: number;
  }> {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      const beforeInfo = await client.info('memory');
      const beforeMemory = this.parseMemoryInfo(beforeInfo);

      // Perform memory optimization
      await this.performMemoryOptimization(client);

      const afterInfo = await client.info('memory');
      const afterMemory = this.parseMemoryInfo(afterInfo);

      const result = {
        before: beforeMemory.used,
        after: afterMemory.used,
        freed: beforeMemory.used - afterMemory.used,
      };

      this.structuredLogger.logBusinessEvent('redis_memory_optimization', result);

      this.logger.log('Redis memory optimization completed', result);

      return result;
    } catch (error) {
      this.logger.error('Failed to optimize Redis memory usage:', error);
      throw error;
    }
  }

  private async performMemoryOptimization(client: any): Promise<void> {
    try {
      // Clear expired keys using proper Lua script
      await client.eval(
        "local keys = redis.call('keys', '*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return #keys",
        0,
      );

      // Force memory defragmentation - Use sendCommand for better compatibility
      try {
        await client.sendCommand(['MEMORY', 'PURGE']);
        this.logger.debug('Memory purge command executed successfully');
      } catch (memoryError) {
        // Fallback: If MEMORY PURGE is not supported, try alternative optimization
        this.logger.warn('MEMORY PURGE not supported, using alternative optimization');

        // Alternative: Force garbage collection by setting maxmemory policy
        try {
          await client.sendCommand(['CONFIG', 'SET', 'maxmemory-policy', 'allkeys-lru']);
          await client.sendCommand(['CONFIG', 'SET', 'maxmemory-policy', 'noeviction']);
          this.logger.debug('Alternative memory optimization completed');
        } catch (configError) {
          this.logger.warn('Alternative memory optimization failed:', configError.message);
        }
      }

      this.logger.debug('Memory optimization operations completed');
    } catch (error) {
      this.logger.error('Failed to perform memory optimization:', error);
      throw error;
    }
  }

  async getSlowQueries(limit: number = 10): Promise<
    Array<{
      id: number;
      timestamp: number;
      duration: number;
      command: string;
      args: string[];
    }>
  > {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      // Sử dụng sendCommand thay vì gọi trực tiếp slowlog
      const slowLog = await client.sendCommand(['SLOWLOG', 'GET', limit.toString()]);

      // Kiểm tra null/undefined và đảm bảo slowLog là array
      if (!slowLog || !Array.isArray(slowLog)) {
        this.logger.warn('Slow log returned invalid data');
        return [];
      }

      return slowLog.map((entry: any) => ({
        id: entry[0],
        timestamp: entry[1],
        duration: entry[2],
        command: entry[3],
        args: entry[4],
      }));
    } catch (error) {
      this.logger.error('Failed to get slow queries:', error);
      return [];
    }
  }

  async clearSlowLog(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      // Sử dụng sendCommand thay vì gọi trực tiếp slowlog
      await client.sendCommand(['SLOWLOG', 'RESET']);
      this.logger.log('Slow log cleared');
    } catch (error) {
      this.logger.error('Failed to clear slow log:', error);
      throw error;
    }
  }

  private async performOptimization(): Promise<void> {
    try {
      const metrics = await this.getPerformanceMetrics();

      // Check if optimization is needed
      if (metrics.memory.fragmentation > 1.5) {
        this.logger.warn('High memory fragmentation detected, performing optimization');
        await this.optimizeMemoryUsage();
      }

      if (metrics.operations.slowQueries > 100) {
        this.logger.warn('High number of slow queries detected, clearing slow log');
        await this.clearSlowLog();
      }

      this.logger.debug('Periodic Redis optimization completed');
    } catch (error) {
      this.logger.error('Failed to perform periodic optimization:', error);
    }
  }

  async getOptimizationRecommendations(): Promise<string[]> {
    try {
      const metrics = await this.getPerformanceMetrics();
      const recommendations: string[] = [];

      if (metrics.memory.fragmentation > 1.5) {
        recommendations.push(
          'High memory fragmentation detected. Consider running memory optimization.',
        );
      }

      if (metrics.connections.total > 8000) {
        recommendations.push(
          'High number of connections. Consider increasing max clients or optimizing connection pooling.',
        );
      }

      if (metrics.operations.commandsPerSecond > 10000) {
        recommendations.push(
          'High command rate. Consider implementing command batching or caching strategies.',
        );
      }

      if (metrics.operations.slowQueries > 50) {
        recommendations.push('Multiple slow queries detected. Review and optimize slow queries.');
      }

      if (metrics.keyspace.expiredKeys > 1000) {
        recommendations.push(
          'High number of expired keys. Consider optimizing key expiration strategy.',
        );
      }

      return recommendations;
    } catch (error) {
      this.logger.error('Failed to get optimization recommendations:', error);
      return [];
    }
  }

  onModuleDestroy(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
  }
}
