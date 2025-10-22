import { PrometheusService } from '../monitoring/prometheus.service';
import { Injectable, Logger } from '@nestjs/common';

export interface ScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
  responseTime: number;
  queueLength: number;
  errorRate: number;
  activeConnections: number;
}

export interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'no_action';
  reason: string;
  currentInstances: number;
  targetInstances: number;
  confidence: number;
  metrics: ScalingMetrics;
}

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCpuUsage: number;
  targetMemoryUsage: number;
  targetResponseTime: number;
  targetQueueLength: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
}

@Injectable()
export class HorizontalScalingService {
  private readonly logger = new Logger(HorizontalScalingService.name);
  private readonly scalingHistory: ScalingDecision[] = [];
  private readonly lastScalingTime = new Map<string, number>();
  private readonly scalingConfig: ScalingConfig;

  constructor(private readonly prometheusService: PrometheusService) {
    this.scalingConfig = {
      minInstances: parseInt(process.env.MIN_INSTANCES || '2'),
      maxInstances: parseInt(process.env.MAX_INSTANCES || '10'),
      targetCpuUsage: parseFloat(process.env.TARGET_CPU_USAGE || '70'),
      targetMemoryUsage: parseFloat(process.env.TARGET_MEMORY_USAGE || '80'),
      targetResponseTime: parseFloat(process.env.TARGET_RESPONSE_TIME || '500'),
      targetQueueLength: parseInt(process.env.TARGET_QUEUE_LENGTH || '100'),
      scaleUpThreshold: parseFloat(process.env.SCALE_UP_THRESHOLD || '0.8'),
      scaleDownThreshold: parseFloat(process.env.SCALE_DOWN_THRESHOLD || '0.3'),
      cooldownPeriod: parseInt(process.env.COOLDOWN_PERIOD || '300000'), // 5 minutes
    };
  }

  async evaluateScaling(serviceName: string): Promise<ScalingDecision> {
    try {
      const metrics = await this.getCurrentMetrics(serviceName);
      const currentInstances = await this.getCurrentInstanceCount(serviceName);
      const decision = await this.makeScalingDecision(serviceName, metrics, currentInstances);

      // Store decision in history
      this.scalingHistory.push(decision);
      if (this.scalingHistory.length > 100) {
        this.scalingHistory.shift();
      }

      this.logger.log(`Scaling decision for ${serviceName}: ${decision.action}`, {
        serviceName,
        action: decision.action,
        currentInstances: decision.currentInstances,
        targetInstances: decision.targetInstances,
        reason: decision.reason,
      });

      return decision;
    } catch (error) {
      this.logger.error(`Failed to evaluate scaling for ${serviceName}:`, error);
      throw error;
    }
  }

  async executeScaling(serviceName: string, decision: ScalingDecision): Promise<boolean> {
    try {
      if (decision.action === 'no_action') {
        return true;
      }

      this.logger.log(`Executing scaling for ${serviceName}: ${decision.action}`, {
        serviceName,
        action: decision.action,
        fromInstances: decision.currentInstances,
        toInstances: decision.targetInstances,
        reason: decision.reason,
      });

      // In a real implementation, you would call your orchestration platform here
      // For now, we'll just simulate the scaling operation
      await this.simulateScaling(serviceName, decision);

      this.logger.log(`Scaling completed for ${serviceName}`, {
        serviceName,
        action: decision.action,
        targetInstances: decision.targetInstances,
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to execute scaling for ${serviceName}:`, error);
      throw error;
    }
  }

  async getCurrentMetrics(serviceName: string): Promise<ScalingMetrics> {
    try {
      // In a real implementation, you would fetch from Prometheus
      // For now, we'll return simulated metrics
      return {
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        requestRate: Math.random() * 1000,
        responseTime: Math.random() * 1000,
        queueLength: Math.floor(Math.random() * 500),
        errorRate: Math.random() * 10,
        activeConnections: Math.floor(Math.random() * 1000),
      };
    } catch (error) {
      this.logger.error(`Failed to get metrics for ${serviceName}:`, error);
      throw error;
    }
  }

  private async getCurrentInstanceCount(serviceName: string): Promise<number> {
    // In a real implementation, you would fetch from your orchestration platform
    const lastDecision = this.scalingHistory[this.scalingHistory.length - 1];
    return lastDecision?.targetInstances || this.scalingConfig.minInstances;
  }

  private async makeScalingDecision(
    serviceName: string,
    metrics: ScalingMetrics,
    currentInstances: number,
  ): Promise<ScalingDecision> {
    const now = Date.now();
    const lastScaling = this.lastScalingTime.get(serviceName) || 0;

    // Check cooldown period
    if (now - lastScaling < this.scalingConfig.cooldownPeriod) {
      return {
        action: 'no_action',
        reason: 'In cooldown period',
        currentInstances,
        targetInstances: currentInstances,
        confidence: 1.0,
        metrics,
      };
    }

    const scalingScore = this.calculateScalingScore(metrics);

    // Scale up decision
    if (
      scalingScore > this.scalingConfig.scaleUpThreshold &&
      currentInstances < this.scalingConfig.maxInstances
    ) {
      const targetInstances = Math.min(currentInstances + 1, this.scalingConfig.maxInstances);
      this.lastScalingTime.set(serviceName, now);

      return {
        action: 'scale_up',
        reason: `High load detected (score: ${scalingScore.toFixed(2)})`,
        currentInstances,
        targetInstances,
        confidence: scalingScore,
        metrics,
      };
    }

    // Scale down decision
    if (
      scalingScore < this.scalingConfig.scaleDownThreshold &&
      currentInstances > this.scalingConfig.minInstances
    ) {
      const targetInstances = Math.max(currentInstances - 1, this.scalingConfig.minInstances);
      this.lastScalingTime.set(serviceName, now);

      return {
        action: 'scale_down',
        reason: `Low load detected (score: ${scalingScore.toFixed(2)})`,
        currentInstances,
        targetInstances,
        confidence: 1 - scalingScore,
        metrics,
      };
    }

    // No action needed
    return {
      action: 'no_action',
      reason: 'Load within acceptable range',
      currentInstances,
      targetInstances: currentInstances,
      confidence: 0.5,
      metrics,
    };
  }

  private calculateScalingScore(metrics: ScalingMetrics): number {
    const cpuScore = metrics.cpuUsage / 100;
    const memoryScore = metrics.memoryUsage / 100;
    const responseTimeScore = Math.min(
      metrics.responseTime / this.scalingConfig.targetResponseTime,
      2,
    );
    const queueScore = Math.min(metrics.queueLength / this.scalingConfig.targetQueueLength, 2);
    const errorScore = Math.min(metrics.errorRate / 5, 2);

    // Weighted average
    return (
      cpuScore * 0.3 +
      memoryScore * 0.2 +
      responseTimeScore * 0.2 +
      queueScore * 0.2 +
      errorScore * 0.1
    );
  }

  private async simulateScaling(serviceName: string, decision: ScalingDecision): Promise<void> {
    // Simulate scaling delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.logger.log(
      `Simulated scaling for ${serviceName} to ${decision.targetInstances} instances`,
    );
  }

  async getScalingHistory(): Promise<ScalingDecision[]> {
    return [...this.scalingHistory];
  }

  async getScalingRecommendations(serviceName: string): Promise<string[]> {
    try {
      const metrics = await this.getCurrentMetrics(serviceName);
      const recommendations: string[] = [];

      if (metrics.memoryUsage > this.scalingConfig.targetMemoryUsage) {
        recommendations.push(
          `High memory usage (${metrics.memoryUsage.toFixed(1)}%). Consider scaling up or optimizing memory usage.`,
        );
      }

      if (metrics.responseTime > this.scalingConfig.targetResponseTime) {
        recommendations.push(
          `High response time (${metrics.responseTime.toFixed(0)}ms). Consider scaling up or optimizing queries.`,
        );
      }

      if (metrics.queueLength > this.scalingConfig.targetQueueLength) {
        recommendations.push(
          `High queue length (${metrics.queueLength}). Consider scaling up or optimizing processing.`,
        );
      }

      if (metrics.errorRate > 5) {
        recommendations.push(
          `High error rate (${metrics.errorRate.toFixed(1)}%). Investigate and fix errors before scaling.`,
        );
      }

      if (recommendations.length === 0) {
        recommendations.push('System is performing well. No immediate scaling recommendations.');
      }

      return recommendations;
    } catch (error) {
      this.logger.error(`Failed to get scaling recommendations for ${serviceName}:`, error);
      throw error;
    }
  }

  async updateScalingConfig(newConfig: Partial<ScalingConfig>): Promise<void> {
    try {
      Object.assign(this.scalingConfig, newConfig);
      this.logger.log('Scaling configuration updated', newConfig);
    } catch (error) {
      this.logger.error('Failed to update scaling configuration:', error);
      throw error;
    }
  }

  getScalingConfig(): ScalingConfig {
    return { ...this.scalingConfig };
  }

  async getScalingMetrics(serviceName: string): Promise<{
    current: ScalingMetrics;
    average: ScalingMetrics;
    peak: ScalingMetrics;
  }> {
    try {
      const current = await this.getCurrentMetrics(serviceName);

      // Simulate average and peak metrics
      const average: ScalingMetrics = {
        cpuUsage: current.cpuUsage * 0.8,
        memoryUsage: current.memoryUsage * 0.8,
        requestRate: current.requestRate * 0.8,
        responseTime: current.responseTime * 0.8,
        queueLength: current.queueLength * 0.8,
        errorRate: current.errorRate * 0.8,
        activeConnections: current.activeConnections * 0.8,
      };

      const peak: ScalingMetrics = {
        cpuUsage: Math.min(current.cpuUsage * 1.2, 100),
        memoryUsage: Math.min(current.memoryUsage * 1.2, 100),
        requestRate: current.requestRate * 1.2,
        responseTime: current.responseTime * 1.2,
        queueLength: current.queueLength * 1.2,
        errorRate: current.errorRate * 1.2,
        activeConnections: current.activeConnections * 1.2,
      };

      return { current, average, peak };
    } catch (error) {
      this.logger.error(`Failed to get scaling metrics for ${serviceName}:`, error);
      throw error;
    }
  }
}
