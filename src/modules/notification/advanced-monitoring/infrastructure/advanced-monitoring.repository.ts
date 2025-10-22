import { MonitoringMetric } from '../domain/monitoring-metric.entity';
import {
  MonitoringMetricFilters,
  MonitoringDashboard,
} from '../application/services/advanced-monitoring.service';

export interface AdvancedMonitoringRepository {
  create(monitoringMetric: MonitoringMetric): Promise<MonitoringMetric>;
  findById(id: string): Promise<MonitoringMetric | null>;
  findByMetricId(metricId: string): Promise<MonitoringMetric | null>;
  find(filters: MonitoringMetricFilters): Promise<{
    monitoringMetrics: MonitoringMetric[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  update(id: string, monitoringMetric: MonitoringMetric): Promise<MonitoringMetric>;
  delete(id: string): Promise<void>;
  findBySource(source: string): Promise<MonitoringMetric[]>;
  findByType(type: string): Promise<MonitoringMetric[]>;
  findByTags(tags: Record<string, string>): Promise<MonitoringMetric[]>;
  getDashboard(): Promise<MonitoringDashboard>;
  getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    averageValue: number;
    minValue: number;
    maxValue: number;
    recentCount: number;
  }>;
  getTrends(
    metricName: string,
    timeRange: { start: Date; end: Date },
    interval: 'minute' | 'hour' | 'day',
  ): Promise<
    Array<{
      timestamp: Date;
      value: number;
      count: number;
    }>
  >;
  getAlerts(): Promise<
    Array<{
      metricName: string;
      condition: string;
      value: number;
      threshold: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: Date;
    }>
  >;
  createAlert(alert: {
    metricName: string;
    condition: string;
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }): Promise<void>;
  cleanupOld(cutoffDate: Date): Promise<{ deletedCount: number }>;
  export(
    filters: MonitoringMetricFilters,
    format: 'json' | 'csv' | 'excel',
  ): Promise<{
    data: any;
    format: string;
    count: number;
    timestamp: Date;
  }>;
  getHealth(): Promise<{
    isHealthy: boolean;
    status: string;
    metrics: {
      totalMetrics: number;
      activeMetrics: number;
      errorMetrics: number;
      averageValue: number;
      successRate: number;
    };
  }>;
}
