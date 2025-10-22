import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { Injectable, Get, Query, Logger } from '@nestjs/common';
import { Type } from 'class-transformer';

@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);

  // HTTP Metrics
  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  private readonly httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  private readonly httpRequestInProgress = new Gauge({
    name: 'http_requests_in_progress',
    help: 'Number of HTTP requests currently in progress',
    labelNames: ['method', 'route'],
  });

  // Notification Metrics
  private readonly notificationSent = new Counter({
    name: 'notifications_sent_total',
    help: 'Total number of notifications sent',
    labelNames: ['type', 'channel', 'status'],
  });

  private readonly notificationProcessingDuration = new Histogram({
    name: 'notification_processing_duration_seconds',
    help: 'Duration of notification processing in seconds',
    labelNames: ['type', 'channel'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  });

  private readonly notificationQueueSize = new Gauge({
    name: 'notification_queue_size',
    help: 'Current size of notification queue',
    labelNames: ['queue_name', 'priority'],
  });

  private readonly notificationQueueProcessingRate = new Gauge({
    name: 'notification_queue_processing_rate',
    help: 'Current processing rate of notification queue',
    labelNames: ['queue_name'],
  });

  // Database Metrics
  private readonly databaseConnections = new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections',
    labelNames: ['database'],
  });

  private readonly databaseQueryDuration = new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'collection'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  });

  // Cache Metrics
  private readonly cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
  });

  private readonly cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
  });

  private readonly cacheOperations = new Counter({
    name: 'cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['operation', 'cache_type', 'status'],
  });

  // Message Queue Metrics
  private readonly messageQueueSize = new Gauge({
    name: 'message_queue_size',
    help: 'Current size of message queue',
    labelNames: ['queue_name'],
  });

  private readonly messageProcessingDuration = new Histogram({
    name: 'message_processing_duration_seconds',
    help: 'Duration of message processing in seconds',
    labelNames: ['queue_name', 'message_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  });

  // System Metrics
  private readonly memoryUsage = new Gauge({
    name: 'nodejs_memory_usage_bytes',
    help: 'Node.js memory usage in bytes',
    labelNames: ['type'],
  });

  private readonly eventLoopLag = new Gauge({
    name: 'nodejs_eventloop_lag_seconds',
    help: 'Node.js event loop lag in seconds',
  });

  private readonly activeHandles = new Gauge({
    name: 'nodejs_active_handles',
    help: 'Number of active handles',
  });

  private readonly activeRequests = new Gauge({
    name: 'nodejs_active_requests',
    help: 'Number of active requests',
  });

  // Redis optimization metrics
  private readonly redisMemoryUsage = new Gauge({
    name: 'redis_memory_usage_bytes',
    help: 'Redis memory usage in bytes',
  });

  private readonly redisMemoryPeak = new Gauge({
    name: 'redis_memory_peak_bytes',
    help: 'Redis memory peak usage in bytes',
  });

  private readonly redisFragmentationRatio = new Gauge({
    name: 'redis_fragmentation_ratio',
    help: 'Redis memory fragmentation ratio',
  });

  private readonly redisConnections = new Gauge({
    name: 'redis_connections_total',
    help: 'Total Redis connections',
  });

  private readonly redisActiveConnections = new Gauge({
    name: 'redis_active_connections',
    help: 'Active Redis connections',
  });

  private readonly redisCommandsPerSecond = new Gauge({
    name: 'redis_commands_per_second',
    help: 'Redis commands per second',
  });

  private readonly redisSlowQueries = new Gauge({
    name: 'redis_slow_queries_total',
    help: 'Total Redis slow queries',
  });

  private readonly redisTotalKeys = new Gauge({
    name: 'redis_total_keys',
    help: 'Total Redis keys',
  });

  private readonly redisExpiredKeys = new Gauge({
    name: 'redis_expired_keys_total',
    help: 'Total expired Redis keys',
  });

  private readonly redisEvictedKeys = new Gauge({
    name: 'redis_evicted_keys_total',
    help: 'Total evicted Redis keys',
  });

  // Connection pool metrics
  private readonly connectionPoolAcquisitions = new Counter({
    name: 'connection_pool_acquisitions_total',
    help: 'Total connection pool acquisitions',
    labelNames: ['pool_name'],
  });

  private readonly connectionPoolReleases = new Counter({
    name: 'connection_pool_releases_total',
    help: 'Total connection pool releases',
    labelNames: ['pool_name'],
  });

  private readonly connectionPoolCreations = new Counter({
    name: 'connection_pool_creations_total',
    help: 'Total connection pool creations',
    labelNames: ['pool_name'],
  });

  private readonly connectionPoolDestructions = new Counter({
    name: 'connection_pool_destructions_total',
    help: 'Total connection pool destructions',
    labelNames: ['pool_name'],
  });

  private readonly connectionPoolAcquisitionDuration = new Histogram({
    name: 'connection_pool_acquisition_duration_seconds',
    help: 'Connection pool acquisition duration in seconds',
    labelNames: ['pool_name'],
  });

  private readonly connectionPoolCreationDuration = new Histogram({
    name: 'connection_pool_creation_duration_seconds',
    help: 'Connection pool creation duration in seconds',
    labelNames: ['pool_name'],
  });

  // Scaling metrics
  private readonly scalingEvents = new Counter({
    name: 'scaling_events_total',
    help: 'Total scaling events',
    labelNames: ['service_name', 'action', 'from_instances', 'to_instances'],
  });

  constructor() {
    // Register default metrics
    collectDefaultMetrics({
      register,
      prefix: 'cdx_notification_service_',
    });

    // Register custom metrics
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestTotal);
    register.registerMetric(this.httpRequestInProgress);
    register.registerMetric(this.notificationSent);
    register.registerMetric(this.notificationProcessingDuration);
    register.registerMetric(this.notificationQueueSize);
    register.registerMetric(this.notificationQueueProcessingRate);
    register.registerMetric(this.databaseConnections);
    register.registerMetric(this.databaseQueryDuration);
    register.registerMetric(this.cacheHits);
    register.registerMetric(this.cacheMisses);
    register.registerMetric(this.cacheOperations);
    register.registerMetric(this.messageQueueSize);
    register.registerMetric(this.messageProcessingDuration);
    register.registerMetric(this.memoryUsage);
    register.registerMetric(this.eventLoopLag);
    register.registerMetric(this.activeHandles);
    register.registerMetric(this.activeRequests);

    // Register Redis optimization metrics
    register.registerMetric(this.redisMemoryUsage);
    register.registerMetric(this.redisMemoryPeak);
    register.registerMetric(this.redisFragmentationRatio);
    register.registerMetric(this.redisConnections);
    register.registerMetric(this.redisActiveConnections);
    register.registerMetric(this.redisCommandsPerSecond);
    register.registerMetric(this.redisSlowQueries);
    register.registerMetric(this.redisTotalKeys);
    register.registerMetric(this.redisExpiredKeys);
    register.registerMetric(this.redisEvictedKeys);

    // Register connection pool metrics
    register.registerMetric(this.connectionPoolAcquisitions);
    register.registerMetric(this.connectionPoolReleases);
    register.registerMetric(this.connectionPoolCreations);
    register.registerMetric(this.connectionPoolDestructions);
    register.registerMetric(this.connectionPoolAcquisitionDuration);
    register.registerMetric(this.connectionPoolCreationDuration);

    // Register scaling metrics
    register.registerMetric(this.scalingEvents);

    this.logger.log('Prometheus metrics initialized');
  }

  // HTTP Metrics Methods
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);

    this.httpRequestTotal.labels(method, route, statusCode.toString()).inc();
  }

  incrementHttpRequestInProgress(method: string, route: string) {
    this.httpRequestInProgress.labels(method, route).inc();
  }

  decrementHttpRequestInProgress(method: string, route: string) {
    this.httpRequestInProgress.labels(method, route).dec();
  }

  // Notification Metrics Methods
  recordNotificationSent(type: string, channel: string, status: string) {
    this.notificationSent.labels(type, channel, status).inc();
  }

  recordNotificationProcessingDuration(type: string, channel: string, duration: number) {
    this.notificationProcessingDuration.labels(type, channel).observe(duration);
  }

  setNotificationQueueSize(queueName: string, priority: string, size: number) {
    this.notificationQueueSize.labels(queueName, priority).set(size);
  }

  setNotificationQueueProcessingRate(queueName: string, rate: number) {
    this.notificationQueueProcessingRate.labels(queueName).set(rate);
  }

  // Database Metrics Methods
  setDatabaseConnections(database: string, connections: number) {
    this.databaseConnections.labels(database).set(connections);
  }

  recordDatabaseQueryDuration(operation: string, collection: string, duration: number) {
    this.databaseQueryDuration.labels(operation, collection).observe(duration);
  }

  // Cache Metrics Methods
  recordCacheHit(cacheType: string) {
    this.cacheHits.labels(cacheType).inc();
  }

  recordCacheMiss(cacheType: string) {
    this.cacheMisses.labels(cacheType).inc();
  }

  recordCacheOperation(operation: string, cacheType: string, status: string) {
    this.cacheOperations.labels(operation, cacheType, status).inc();
  }

  // Message Queue Metrics Methods
  setMessageQueueSize(queueName: string, size: number) {
    this.messageQueueSize.labels(queueName).set(size);
  }

  recordMessageProcessingDuration(queueName: string, messageType: string, duration: number) {
    this.messageProcessingDuration.labels(queueName, messageType).observe(duration);
  }

  // System Metrics Methods
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.memoryUsage.labels('rss').set(memUsage.rss);
    this.memoryUsage.labels('heapTotal').set(memUsage.heapTotal);
    this.memoryUsage.labels('heapUsed').set(memUsage.heapUsed);
    this.memoryUsage.labels('external').set(memUsage.external);

    // Update event loop lag
    const start = process.hrtime();
    setImmediate(() => {
      const delta = process.hrtime(start);
      const lag = delta[0] * 1000 + delta[1] / 1e6;
      this.eventLoopLag.set(lag);
    });

    // Safely update active handles/requests if available
    try {
      const anyProcess: any = process as any;
      const handles =
        typeof anyProcess._getActiveHandles === 'function' ? anyProcess._getActiveHandles() : [];
      const requests =
        typeof anyProcess._getActiveRequests === 'function' ? anyProcess._getActiveRequests() : [];
      this.activeHandles.set(Array.isArray(handles) ? handles.length : 0);
      this.activeRequests.set(Array.isArray(requests) ? requests.length : 0);
    } catch {
      this.activeHandles.set(0);
      this.activeRequests.set(0);
    }
  }

  // Get metrics in Prometheus format
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Get metrics in JSON format
  async getMetricsAsJson(): Promise<any> {
    return register.getMetricsAsJSON();
  }

  // Redis optimization metrics methods
  setRedisMemoryUsage(bytes: number) {
    this.redisMemoryUsage.set(bytes);
  }

  setRedisMemoryPeak(bytes: number) {
    this.redisMemoryPeak.set(bytes);
  }

  setRedisFragmentationRatio(ratio: number) {
    this.redisFragmentationRatio.set(ratio);
  }

  setRedisConnections(count: number) {
    this.redisConnections.set(count);
  }

  setRedisActiveConnections(count: number) {
    this.redisActiveConnections.set(count);
  }

  setRedisCommandsPerSecond(rate: number) {
    this.redisCommandsPerSecond.set(rate);
  }

  setRedisSlowQueries(count: number) {
    this.redisSlowQueries.set(count);
  }

  setRedisTotalKeys(count: number) {
    this.redisTotalKeys.set(count);
  }

  setRedisExpiredKeys(count: number) {
    this.redisExpiredKeys.set(count);
  }

  setRedisEvictedKeys(count: number) {
    this.redisEvictedKeys.set(count);
  }

  // Connection pool metrics methods
  recordConnectionPoolAcquisition(poolName: string, duration: number) {
    this.connectionPoolAcquisitions.labels(poolName).inc();
    this.connectionPoolAcquisitionDuration.labels(poolName).observe(duration);
  }

  recordConnectionPoolRelease(poolName: string) {
    this.connectionPoolReleases.labels(poolName).inc();
  }

  recordConnectionPoolCreation(poolName: string, duration: number) {
    this.connectionPoolCreations.labels(poolName).inc();
    this.connectionPoolCreationDuration.labels(poolName).observe(duration);
  }

  recordConnectionPoolDestruction(poolName: string) {
    this.connectionPoolDestructions.labels(poolName).inc();
  }

  // Scaling metrics methods
  recordScalingEvent(
    serviceName: string,
    action: string,
    fromInstances: number,
    toInstances: number,
  ) {
    this.scalingEvents
      .labels(serviceName, action, fromInstances.toString(), toInstances.toString())
      .inc();
  }

  // Clear all metrics
  clearMetrics(): void {
    register.clear();
    this.logger.log('All metrics cleared');
  }
}
