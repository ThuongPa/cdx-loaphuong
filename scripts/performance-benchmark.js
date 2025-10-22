#!/usr/bin/env node

/**
 * Performance Benchmark Script for CDX Notification Service
 *
 * This script runs comprehensive performance benchmarks to test:
 * - MongoDB bulk operations
 * - Redis optimization
 * - Connection pooling
 * - Horizontal scaling decisions
 * - API endpoint performance
 */

const { performance } = require('perf_hooks');
const axios = require('axios');

// Configuration
const CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  authToken: process.env.AUTH_TOKEN || 'your-jwt-token-here',
  benchmarkDuration: parseInt(process.env.BENCHMARK_DURATION || '60000'), // 1 minute
  concurrentRequests: parseInt(process.env.CONCURRENT_REQUESTS || '10'),
  testDataSize: parseInt(process.env.TEST_DATA_SIZE || '1000'),
};

// Test data generators
const generateNotificationData = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `test_${Date.now()}_${i}`,
    userId: `user_${i % 100}`,
    type: 'test',
    title: `Test Notification ${i}`,
    body: `Test body content ${i}`,
    data: { testField: `value_${i}` },
    priority: ['high', 'normal', 'low'][i % 3],
    createdAt: new Date().toISOString(),
  }));
};

const generateBulkOperationData = (count) => {
  return {
    operation: 'insert',
    collection: 'notifications',
    documents: generateNotificationData(count),
  };
};

// Benchmark utilities
class BenchmarkRunner {
  constructor() {
    this.results = {
      mongodb: [],
      redis: [],
      connectionPool: [],
      scaling: [],
      api: [],
    };
  }

  async runBenchmark(name, testFunction, iterations = 1) {
    console.log(`\n🚀 Running benchmark: ${name}`);
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      try {
        const result = await testFunction();
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          iteration: i + 1,
          duration,
          success: true,
          result,
        });

        console.log(`  ✅ Iteration ${i + 1}: ${duration.toFixed(2)}ms`);
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          iteration: i + 1,
          duration,
          success: false,
          error: error.message,
        });

        console.log(`  ❌ Iteration ${i + 1}: ${duration.toFixed(2)}ms - ${error.message}`);
      }
    }

    return this.calculateStats(results);
  }

  calculateStats(results) {
    const successful = results.filter((r) => r.success);
    const durations = successful.map((r) => r.duration);

    if (durations.length === 0) {
      return {
        total: results.length,
        successful: 0,
        failed: results.length,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        throughput: 0,
      };
    }

    durations.sort((a, b) => a - b);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Duration = durations[p95Index];

    return {
      total: results.length,
      successful: successful.length,
      failed: results.length - successful.length,
      avgDuration: Math.round(avgDuration * 100) / 100,
      minDuration: Math.round(durations[0] * 100) / 100,
      maxDuration: Math.round(durations[durations.length - 1] * 100) / 100,
      p95Duration: Math.round(p95Duration * 100) / 100,
      throughput:
        Math.round((successful.length / (durations.reduce((a, b) => a + b, 0) / 1000)) * 100) / 100,
    };
  }

  async runConcurrentTest(name, testFunction, concurrency = 10, duration = 60000) {
    console.log(`\n🔄 Running concurrent test: ${name} (${concurrency} concurrent, ${duration}ms)`);

    const startTime = performance.now();
    const results = [];
    const promises = [];

    // Start concurrent operations
    for (let i = 0; i < concurrency; i++) {
      const promise = this.runConcurrentWorker(testFunction, startTime, duration, results, i);
      promises.push(promise);
    }

    await Promise.all(promises);
    const endTime = performance.now();

    return this.calculateConcurrentStats(results, endTime - startTime);
  }

  async runConcurrentWorker(testFunction, startTime, duration, results, workerId) {
    while (performance.now() - startTime < duration) {
      const iterationStart = performance.now();
      try {
        await testFunction();
        const iterationEnd = performance.now();
        results.push({
          workerId,
          duration: iterationEnd - iterationStart,
          success: true,
          timestamp: iterationEnd,
        });
      } catch (error) {
        const iterationEnd = performance.now();
        results.push({
          workerId,
          duration: iterationEnd - iterationStart,
          success: false,
          error: error.message,
          timestamp: iterationEnd,
        });
      }
    }
  }

  calculateConcurrentStats(results, totalDuration) {
    const successful = results.filter((r) => r.success);
    const durations = successful.map((r) => r.duration);

    return {
      totalDuration: Math.round(totalDuration),
      totalOperations: results.length,
      successfulOperations: successful.length,
      failedOperations: results.length - successful.length,
      operationsPerSecond: Math.round((results.length / (totalDuration / 1000)) * 100) / 100,
      avgResponseTime:
        durations.length > 0
          ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100
          : 0,
      minResponseTime: durations.length > 0 ? Math.round(Math.min(...durations) * 100) / 100 : 0,
      maxResponseTime: durations.length > 0 ? Math.round(Math.max(...durations) * 100) / 100 : 0,
    };
  }

  printResults() {
    console.log('\n📊 BENCHMARK RESULTS');
    console.log('='.repeat(50));

    Object.entries(this.results).forEach(([category, results]) => {
      if (results.length > 0) {
        console.log(`\n${category.toUpperCase()}:`);
        results.forEach((result) => {
          console.log(`  ${result.name}:`);
          console.log(
            `    Success Rate: ${result.successful}/${result.total} (${Math.round((result.successful / result.total) * 100)}%)`,
          );
          console.log(`    Avg Duration: ${result.avgDuration}ms`);
          console.log(`    Min Duration: ${result.minDuration}ms`);
          console.log(`    Max Duration: ${result.maxDuration}ms`);
          if (result.p95Duration) {
            console.log(`    P95 Duration: ${result.p95Duration}ms`);
          }
          if (result.throughput) {
            console.log(`    Throughput: ${result.throughput} ops/sec`);
          }
          if (result.operationsPerSecond) {
            console.log(`    Ops/sec: ${result.operationsPerSecond}`);
          }
        });
      }
    });
  }
}

// API client
class APIClient {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };
  }

  async request(method, endpoint, data = null) {
    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: this.headers,
      timeout: 30000,
    };

    if (data) {
      config.data = data;
    }

    return axios(config);
  }

  async get(endpoint) {
    return this.request('GET', endpoint);
  }

  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  async put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  }
}

// Benchmark tests
class PerformanceBenchmarks {
  constructor(apiClient, benchmarkRunner) {
    this.api = apiClient;
    this.runner = benchmarkRunner;
  }

  async runMongoDBBenchmarks() {
    console.log('\n🗄️  MongoDB Performance Benchmarks');
    console.log('-'.repeat(40));

    // Bulk insert benchmark
    const bulkInsertStats = await this.runner.runBenchmark(
      'MongoDB Bulk Insert (1000 docs)',
      () => this.api.post('/api/v1/performance/mongodb/bulk', generateBulkOperationData(1000)),
      5,
    );
    this.runner.results.mongodb.push({ name: 'Bulk Insert (1000 docs)', ...bulkInsertStats });

    // Collection stats benchmark
    const statsStats = await this.runner.runBenchmark(
      'MongoDB Collection Stats',
      () => this.api.get('/api/v1/performance/mongodb/collections/stats'),
      10,
    );
    this.runner.results.mongodb.push({ name: 'Collection Stats', ...statsStats });

    // Collection optimization benchmark
    const optimizeStats = await this.runner.runBenchmark(
      'MongoDB Collection Optimization',
      () => this.api.post('/api/v1/performance/mongodb/collections/notifications/optimize'),
      3,
    );
    this.runner.results.mongodb.push({ name: 'Collection Optimization', ...optimizeStats });
  }

  async runRedisBenchmarks() {
    console.log('\n🔴 Redis Performance Benchmarks');
    console.log('-'.repeat(40));

    // Redis metrics benchmark
    const metricsStats = await this.runner.runBenchmark(
      'Redis Performance Metrics',
      () => this.api.get('/api/v1/performance/redis/metrics'),
      10,
    );
    this.runner.results.redis.push({ name: 'Performance Metrics', ...metricsStats });

    // Redis optimization benchmark
    const optimizeStats = await this.runner.runBenchmark(
      'Redis Optimization',
      () => this.api.post('/api/v1/performance/redis/optimize'),
      3,
    );
    this.runner.results.redis.push({ name: 'Optimization', ...optimizeStats });

    // Slow queries benchmark
    const slowQueriesStats = await this.runner.runBenchmark(
      'Redis Slow Queries',
      () => this.api.get('/api/v1/performance/redis/slow-queries'),
      10,
    );
    this.runner.results.redis.push({ name: 'Slow Queries', ...slowQueriesStats });
  }

  async runConnectionPoolBenchmarks() {
    console.log('\n🏊 Connection Pool Performance Benchmarks');
    console.log('-'.repeat(40));

    // Connection pool stats benchmark
    const statsStats = await this.runner.runBenchmark(
      'Connection Pool Stats',
      () => this.api.get('/api/v1/performance/connection-pools/stats'),
      10,
    );
    this.runner.results.connectionPool.push({ name: 'Pool Stats', ...statsStats });

    // Pool health benchmark
    const healthStats = await this.runner.runBenchmark(
      'Connection Pool Health',
      () => this.api.get('/api/v1/performance/connection-pools/mongodb/health'),
      10,
    );
    this.runner.results.connectionPool.push({ name: 'Pool Health', ...healthStats });
  }

  async runScalingBenchmarks() {
    console.log('\n📈 Scaling Performance Benchmarks');
    console.log('-'.repeat(40));

    // Scaling evaluation benchmark
    const evaluateStats = await this.runner.runBenchmark(
      'Scaling Evaluation',
      () => this.api.get('/api/v1/performance/scaling/notification-service/evaluate'),
      10,
    );
    this.runner.results.scaling.push({ name: 'Scaling Evaluation', ...evaluateStats });

    // Scaling metrics benchmark
    const metricsStats = await this.runner.runBenchmark(
      'Scaling Metrics',
      () => this.api.get('/api/v1/performance/scaling/notification-service/metrics'),
      10,
    );
    this.runner.results.scaling.push({ name: 'Scaling Metrics', ...metricsStats });

    // Scaling recommendations benchmark
    const recommendationsStats = await this.runner.runBenchmark(
      'Scaling Recommendations',
      () => this.api.get('/api/v1/performance/scaling/notification-service/recommendations'),
      10,
    );
    this.runner.results.scaling.push({ name: 'Scaling Recommendations', ...recommendationsStats });
  }

  async runAPIBenchmarks() {
    console.log('\n🌐 API Performance Benchmarks');
    console.log('-'.repeat(40));

    // Health check benchmark
    const healthStats = await this.runner.runBenchmark(
      'Health Check',
      () => this.api.get('/monitoring/health'),
      20,
    );
    this.runner.results.api.push({ name: 'Health Check', ...healthStats });

    // Metrics endpoint benchmark
    const metricsStats = await this.runner.runBenchmark(
      'Metrics Endpoint',
      () => this.api.get('/monitoring/metrics'),
      10,
    );
    this.runner.results.api.push({ name: 'Metrics Endpoint', ...metricsStats });

    // Concurrent API test
    const concurrentStats = await this.runner.runConcurrentTest(
      'Concurrent API Requests',
      () => this.api.get('/monitoring/health'),
      20,
      30000,
    );
    this.runner.results.api.push({ name: 'Concurrent Requests (20x30s)', ...concurrentStats });
  }

  async runAllBenchmarks() {
    console.log('🚀 Starting CDX Notification Service Performance Benchmarks');
    console.log(`📊 Configuration:`);
    console.log(`   Base URL: ${CONFIG.baseUrl}`);
    console.log(`   Test Duration: ${CONFIG.benchmarkDuration}ms`);
    console.log(`   Concurrent Requests: ${CONFIG.concurrentRequests}`);
    console.log(`   Test Data Size: ${CONFIG.testDataSize}`);

    try {
      await this.runMongoDBBenchmarks();
      await this.runRedisBenchmarks();
      await this.runConnectionPoolBenchmarks();
      await this.runScalingBenchmarks();
      await this.runAPIBenchmarks();

      this.runner.printResults();
    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const apiClient = new APIClient(CONFIG.baseUrl, CONFIG.authToken);
  const benchmarkRunner = new BenchmarkRunner();
  const benchmarks = new PerformanceBenchmarks(apiClient, benchmarkRunner);

  try {
    // Test API connectivity
    console.log('🔍 Testing API connectivity...');
    await apiClient.get('/monitoring/health');
    console.log('✅ API is accessible');

    // Run all benchmarks
    await benchmarks.runAllBenchmarks();

    console.log('\n🎉 All benchmarks completed successfully!');
  } catch (error) {
    console.error('❌ Benchmark execution failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Benchmark interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Benchmark terminated');
  process.exit(0);
});

// Run benchmarks
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { PerformanceBenchmarks, BenchmarkRunner, APIClient };
