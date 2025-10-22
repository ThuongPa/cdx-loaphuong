import { Test, TestingModule } from '@nestjs/testing';
import { RedisOptimizationService } from '../../src/infrastructure/performance/redis-optimization.service';
import { RedisService } from '../../src/infrastructure/cache/redis.service';
import { PrometheusService } from '../../src/infrastructure/monitoring/prometheus.service';
import { StructuredLoggerService } from '../../src/infrastructure/logging/structured-logger.service';

describe('RedisOptimizationService Performance Tests', () => {
  let service: RedisOptimizationService;
  let redisService: RedisService;
  let prometheusService: PrometheusService;
  let structuredLogger: StructuredLoggerService;

  const mockRedisClient = {
    config: jest.fn(),
    info: jest.fn(),
    slowlog: jest.fn(),
    eval: jest.fn(),
    memory: jest.fn(),
    sendCommand: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisOptimizationService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
        {
          provide: PrometheusService,
          useValue: {
            setRedisMemoryUsage: jest.fn(),
            setRedisMemoryPeak: jest.fn(),
            setRedisFragmentationRatio: jest.fn(),
            setRedisConnections: jest.fn(),
            setRedisActiveConnections: jest.fn(),
            setRedisCommandsPerSecond: jest.fn(),
            setRedisSlowQueries: jest.fn(),
            setRedisTotalKeys: jest.fn(),
            setRedisExpiredKeys: jest.fn(),
            setRedisEvictedKeys: jest.fn(),
          },
        },
        {
          provide: StructuredLoggerService,
          useValue: {
            logBusinessEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RedisOptimizationService>(RedisOptimizationService);
    redisService = module.get<RedisService>(RedisService);
    prometheusService = module.get<PrometheusService>(PrometheusService);
    structuredLogger = module.get<StructuredLoggerService>(StructuredLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Optimization Performance', () => {
    it('should optimize Redis configuration efficiently', async () => {
      mockRedisClient.config.mockResolvedValue('OK');

      const startTime = Date.now();
      const result = await service.optimizeRedisConfiguration();
      const endTime = Date.now();

      expect(result.maxMemory).toBeDefined();
      expect(result.maxMemoryPolicy).toBeDefined();
      expect(result.tcpKeepalive).toBeDefined();
      expect(result.timeout).toBeDefined();
      expect(result.maxClients).toBeDefined();
      expect(result.slowLogThreshold).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      expect(mockRedisClient.config).toHaveBeenCalledWith(
        'SET',
        'maxmemory-policy',
        expect.any(String),
      );
      expect(mockRedisClient.config).toHaveBeenCalledWith(
        'SET',
        'tcp-keepalive',
        expect.any(String),
      );
      expect(mockRedisClient.config).toHaveBeenCalledWith('SET', 'timeout', expect.any(String));
      expect(mockRedisClient.config).toHaveBeenCalledWith(
        'SET',
        'slowlog-log-slower-than',
        expect.any(String),
      );
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect performance metrics efficiently', async () => {
      const memoryInfo = `
used_memory:1048576
used_memory_peak:2097152
mem_fragmentation_ratio:1.5
      `;

      const clientsInfo = `
connected_clients:10
client_recent_max_input_buffer:5
      `;

      const statsInfo = `
total_commands_processed:1000000
instantaneous_ops_per_sec:1000
slowlog_len:5
expired_keys:100
evicted_keys:50
      `;

      const keyspaceInfo = `
db0:keys=1000,expires=100,avg_ttl=3600
      `;

      mockRedisClient.info
        .mockResolvedValueOnce(memoryInfo)
        .mockResolvedValueOnce(clientsInfo)
        .mockResolvedValueOnce(statsInfo)
        .mockResolvedValueOnce(keyspaceInfo);

      mockRedisClient.slowlog.mockResolvedValue([]);

      const startTime = Date.now();
      const metrics = await service.getPerformanceMetrics();
      const endTime = Date.now();

      expect(metrics.memory.used).toBe(1048576);
      expect(metrics.memory.peak).toBe(2097152);
      expect(metrics.memory.fragmentation).toBe(1.5);
      expect(metrics.connections.total).toBe(10);
      expect(metrics.connections.active).toBe(5);
      expect(metrics.connections.idle).toBe(5);
      expect(metrics.operations.totalCommands).toBe(1000000);
      expect(metrics.operations.commandsPerSecond).toBe(1000);
      expect(metrics.operations.slowQueries).toBe(5);
      expect(metrics.keyspace.totalKeys).toBe(1000);
      expect(metrics.keyspace.expiredKeys).toBe(100);
      expect(metrics.keyspace.evictedKeys).toBe(50);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Memory Optimization Performance', () => {
    it('should optimize memory usage efficiently', async () => {
      const beforeInfo = `
used_memory:2097152
used_memory_peak:3145728
mem_fragmentation_ratio:2.0
      `;

      const afterInfo = `
used_memory:1048576
used_memory_peak:3145728
mem_fragmentation_ratio:1.2
      `;

      mockRedisClient.info.mockResolvedValueOnce(beforeInfo).mockResolvedValueOnce(afterInfo);

      mockRedisClient.eval.mockResolvedValue(1000);
      mockRedisClient.sendCommand.mockResolvedValue('OK');

      const startTime = Date.now();
      const result = await service.optimizeMemoryUsage();
      const endTime = Date.now();

      expect(result.before).toBe(2097152);
      expect(result.after).toBe(1048576);
      expect(result.freed).toBe(1048576);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Slow Queries Analysis Performance', () => {
    it('should analyze slow queries efficiently', async () => {
      const slowQueries = [
        [1, 1640995200, 15000, ['GET', 'user:123']],
        [2, 1640995201, 12000, ['SET', 'user:123', 'data']],
        [3, 1640995202, 10000, ['HGETALL', 'user:123:profile']],
      ];

      mockRedisClient.slowlog.mockResolvedValue(slowQueries);

      const startTime = Date.now();
      const queries = await service.getSlowQueries(10);
      const endTime = Date.now();

      expect(queries).toHaveLength(3);
      expect(queries[0].id).toBe(1);
      expect(queries[0].duration).toBe(15000);
      expect(queries[0].command).toBe('GET');
      expect(queries[0].args).toEqual(['user:123']);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Slow Log Management Performance', () => {
    it('should clear slow log efficiently', async () => {
      mockRedisClient.slowlog.mockResolvedValue('OK');

      const startTime = Date.now();
      await service.clearSlowLog();
      const endTime = Date.now();

      expect(mockRedisClient.slowlog).toHaveBeenCalledWith('reset');
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Optimization Recommendations Performance', () => {
    it('should generate recommendations efficiently', async () => {
      const memoryInfo = `
used_memory:2097152
used_memory_peak:3145728
mem_fragmentation_ratio:2.0
      `;

      const clientsInfo = `
connected_clients:9000
client_recent_max_input_buffer:8000
      `;

      const statsInfo = `
total_commands_processed:1000000
instantaneous_ops_per_sec:15000
slowlog_len:100
expired_keys:5000
evicted_keys:1000
      `;

      const keyspaceInfo = `
db0:keys=10000,expires=1000,avg_ttl=3600
      `;

      mockRedisClient.info
        .mockResolvedValueOnce(memoryInfo)
        .mockResolvedValueOnce(clientsInfo)
        .mockResolvedValueOnce(statsInfo)
        .mockResolvedValueOnce(keyspaceInfo);

      mockRedisClient.slowlog.mockResolvedValue([]);

      const startTime = Date.now();
      const recommendations = await service.getOptimizationRecommendations();
      const endTime = Date.now();

      expect(recommendations).toContain(
        'High memory fragmentation detected. Consider running memory optimization.',
      );
      expect(recommendations).toContain(
        'High number of connections. Consider increasing max clients or optimizing connection pooling.',
      );
      expect(recommendations).toContain(
        'High command rate. Consider implementing command batching or caching strategies.',
      );
      expect(recommendations).toContain(
        'Multiple slow queries detected. Review and optimize slow queries.',
      );
      expect(recommendations).toContain(
        'High number of expired keys. Consider optimizing key expiration strategy.',
      );
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle Redis connection errors efficiently', async () => {
      mockRedisClient.info.mockRejectedValue(new Error('Connection lost'));

      const startTime = Date.now();
      await expect(service.getPerformanceMetrics()).rejects.toThrow('Connection lost');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Error handling should be fast
    });

    it('should handle configuration errors efficiently', async () => {
      mockRedisClient.config.mockRejectedValue(new Error('Invalid configuration'));

      const startTime = Date.now();
      await expect(service.optimizeRedisConfiguration()).rejects.toThrow('Invalid configuration');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Error handling should be fast
    });
  });

  describe('Memory Usage Performance', () => {
    it('should handle large datasets without excessive memory usage', async () => {
      const largeMemoryInfo = `
used_memory:1073741824
used_memory_peak:2147483648
mem_fragmentation_ratio:1.8
      `;

      const largeClientsInfo = `
connected_clients:1000
client_recent_max_input_buffer:500
      `;

      const largeStatsInfo = `
total_commands_processed:10000000
instantaneous_ops_per_sec:5000
slowlog_len:50
expired_keys:10000
evicted_keys:5000
      `;

      const largeKeyspaceInfo = `
db0:keys=100000,expires=10000,avg_ttl=3600
      `;

      mockRedisClient.info
        .mockResolvedValueOnce(largeMemoryInfo)
        .mockResolvedValueOnce(largeClientsInfo)
        .mockResolvedValueOnce(largeStatsInfo)
        .mockResolvedValueOnce(largeKeyspaceInfo);

      mockRedisClient.slowlog.mockResolvedValue([]);

      const initialMemory = process.memoryUsage().heapUsed;
      const metrics = await service.getPerformanceMetrics();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(metrics.memory.used).toBe(1073741824);
      expect(metrics.keyspace.totalKeys).toBe(100000);
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent optimization operations efficiently', async () => {
      mockRedisClient.config.mockResolvedValue('OK');
      mockRedisClient.info.mockResolvedValue('used_memory:1048576');
      mockRedisClient.slowlog.mockResolvedValue([]);

      const startTime = Date.now();
      const [config, metrics, recommendations] = await Promise.all([
        service.optimizeRedisConfiguration(),
        service.getPerformanceMetrics(),
        service.getOptimizationRecommendations(),
      ]);
      const endTime = Date.now();

      expect(config).toBeDefined();
      expect(metrics).toBeDefined();
      expect(recommendations).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
