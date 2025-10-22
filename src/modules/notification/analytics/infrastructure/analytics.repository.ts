import { AnalyticsMetric, AnalyticsReport, AnalyticsDashboard } from '../domain/analytics.entity';
import { AnalyticsQuery } from '../application/services/analytics.service';

export interface AnalyticsRepository {
  // Metrics
  saveMetric(metric: AnalyticsMetric): Promise<AnalyticsMetric>;
  findMetricById(id: string): Promise<AnalyticsMetric | null>;
  findMetrics(): Promise<AnalyticsMetric[]>;
  deleteMetric(id: string): Promise<void>;

  // Reports
  saveReport(report: AnalyticsReport): Promise<AnalyticsReport>;
  findReportById(id: string): Promise<AnalyticsReport | null>;
  findReports(): Promise<AnalyticsReport[]>;
  deleteReport(id: string): Promise<void>;

  // Dashboards
  saveDashboard(dashboard: AnalyticsDashboard): Promise<AnalyticsDashboard>;
  findDashboardById(id: string): Promise<AnalyticsDashboard | null>;
  findDashboards(): Promise<AnalyticsDashboard[]>;
  deleteDashboard(id: string): Promise<void>;

  // Analytics Data
  getAnalyticsData(query: AnalyticsQuery): Promise<any>;
  saveAnalyticsData(data: any): Promise<void>;
  getRealTimeData(): Promise<any>;
}
