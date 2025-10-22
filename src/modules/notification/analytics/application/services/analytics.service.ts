import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import {
  AnalyticsMetric,
  AnalyticsMetricType,
  AnalyticsPeriod,
  AnalyticsReportProps,
} from '../../domain/analytics.entity';
import { AnalyticsReport } from '../../domain/analytics.entity';
import { AnalyticsDashboard } from '../../domain/analytics.entity';
import { AnalyticsRepository } from '../../infrastructure/analytics.repository';

export interface CreateMetricDto {
  name: string;
  type: AnalyticsMetricType;
  description?: string;
}

export interface CreateReportDto {
  name: string;
  description?: string;
  metrics: string[];
  filters: {
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
    channels?: string[];
    userSegments?: string[];
    categories?: string[];
    templates?: string[];
  };
  period: AnalyticsPeriod;
  recipients: string[];
}

export interface CreateDashboardDto {
  name: string;
  description?: string;
  widgets: Array<{
    type: 'chart' | 'table' | 'metric' | 'kpi';
    title: string;
    config: Record<string, any>;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  isPublic: boolean;
}

export interface AnalyticsQuery {
  metrics: string[];
  filters: {
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
    channels?: string[];
    userSegments?: string[];
    categories?: string[];
    templates?: string[];
  };
  period: AnalyticsPeriod;
  groupBy?: string[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject('AnalyticsRepository') private readonly analyticsRepository: AnalyticsRepository,
  ) {}

  // Metrics Management
  async createMetric(dto: CreateMetricDto, createdBy: string): Promise<AnalyticsMetric> {
    this.logger.log(`Creating analytics metric: ${dto.name}`);

    try {
      const metric = AnalyticsMetric.create({
        name: dto.name,
        type: dto.type,
        description: dto.description,
        isActive: true,
      });

      const savedMetric = await this.analyticsRepository.saveMetric(metric);
      this.logger.log(`Analytics metric created: ${savedMetric.name} (${savedMetric.id})`);
      return savedMetric;
    } catch (error) {
      this.logger.error(`Failed to create analytics metric: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getMetrics(): Promise<AnalyticsMetric[]> {
    return await this.analyticsRepository.findMetrics();
  }

  async getMetricById(id: string): Promise<AnalyticsMetric> {
    const metric = await this.analyticsRepository.findMetricById(id);
    if (!metric) {
      throw new NotFoundException(`Analytics metric with ID '${id}' not found`);
    }
    return metric;
  }

  async updateMetric(id: string, updates: Partial<CreateMetricDto>): Promise<AnalyticsMetric> {
    const metric = await this.getMetricById(id);
    metric.updateContent(updates);
    return await this.analyticsRepository.saveMetric(metric);
  }

  async deleteMetric(id: string): Promise<void> {
    const metric = await this.getMetricById(id);
    await this.analyticsRepository.deleteMetric(id);
  }

  async activateMetric(id: string): Promise<AnalyticsMetric> {
    const metric = await this.getMetricById(id);
    metric.activate();
    return await this.analyticsRepository.saveMetric(metric);
  }

  async deactivateMetric(id: string): Promise<AnalyticsMetric> {
    const metric = await this.getMetricById(id);
    metric.deactivate();
    return await this.analyticsRepository.saveMetric(metric);
  }

  // Reports Management
  async createReport(dto: CreateReportDto, createdBy: string): Promise<AnalyticsReport> {
    this.logger.log(`Creating analytics report: ${dto.name}`);

    try {
      const report = AnalyticsReport.create({
        name: dto.name,
        description: dto.description,
        metrics: dto.metrics,
        filters: dto.filters,
        period: dto.period,
        isScheduled: false,
        recipients: dto.recipients,
        createdBy,
      });

      const savedReport = await this.analyticsRepository.saveReport(report);
      this.logger.log(`Analytics report created: ${savedReport.name} (${savedReport.id})`);
      return savedReport;
    } catch (error) {
      this.logger.error(`Failed to create analytics report: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getReports(): Promise<AnalyticsReport[]> {
    return await this.analyticsRepository.findReports();
  }

  async getReportById(id: string): Promise<AnalyticsReport> {
    const report = await this.analyticsRepository.findReportById(id);
    if (!report) {
      throw new NotFoundException(`Analytics report with ID '${id}' not found`);
    }
    return report;
  }

  async updateReport(id: string, updates: Partial<CreateReportDto>): Promise<AnalyticsReport> {
    const report = await this.getReportById(id);
    report.updateContent(updates);
    return await this.analyticsRepository.saveReport(report);
  }

  async deleteReport(id: string): Promise<void> {
    const report = await this.getReportById(id);
    await this.analyticsRepository.deleteReport(id);
  }

  async scheduleReport(
    id: string,
    schedule: AnalyticsReportProps['schedule'],
  ): Promise<AnalyticsReport> {
    const report = await this.getReportById(id);
    report.schedule(schedule);
    return await this.analyticsRepository.saveReport(report);
  }

  async unscheduleReport(id: string): Promise<AnalyticsReport> {
    const report = await this.getReportById(id);
    report.unschedule();
    return await this.analyticsRepository.saveReport(report);
  }

  // Dashboard Management
  async createDashboard(dto: CreateDashboardDto, createdBy: string): Promise<AnalyticsDashboard> {
    this.logger.log(`Creating analytics dashboard: ${dto.name}`);

    try {
      const dashboard = AnalyticsDashboard.create({
        name: dto.name,
        description: dto.description,
        widgets: dto.widgets.map((widget, index) => ({
          ...widget,
          id: `widget_${Date.now()}_${index}`,
        })),
        isPublic: dto.isPublic,
        createdBy,
      });

      const savedDashboard = await this.analyticsRepository.saveDashboard(dashboard);
      this.logger.log(`Analytics dashboard created: ${savedDashboard.name} (${savedDashboard.id})`);
      return savedDashboard;
    } catch (error) {
      this.logger.error(`Failed to create analytics dashboard: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDashboards(): Promise<AnalyticsDashboard[]> {
    return await this.analyticsRepository.findDashboards();
  }

  async getDashboardById(id: string): Promise<AnalyticsDashboard> {
    const dashboard = await this.analyticsRepository.findDashboardById(id);
    if (!dashboard) {
      throw new NotFoundException(`Analytics dashboard with ID '${id}' not found`);
    }
    return dashboard;
  }

  async updateDashboard(
    id: string,
    updates: Partial<CreateDashboardDto>,
  ): Promise<AnalyticsDashboard> {
    const dashboard = await this.getDashboardById(id);
    // Convert DTO updates to entity updates
    const entityUpdates: any = { ...updates };
    if (updates.widgets) {
      entityUpdates.widgets = updates.widgets.map((widget, index) => ({
        ...widget,
        id: `widget_${Date.now()}_${index}`,
      }));
    }
    dashboard.updateContent(entityUpdates);
    return await this.analyticsRepository.saveDashboard(dashboard);
  }

  async deleteDashboard(id: string): Promise<void> {
    const dashboard = await this.getDashboardById(id);
    await this.analyticsRepository.deleteDashboard(id);
  }

  async addWidget(
    dashboardId: string,
    widget: CreateDashboardDto['widgets'][0],
  ): Promise<AnalyticsDashboard> {
    const dashboard = await this.getDashboardById(dashboardId);
    const widgetWithId = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    dashboard.addWidget(widgetWithId);
    return await this.analyticsRepository.saveDashboard(dashboard);
  }

  async removeWidget(dashboardId: string, widgetId: string): Promise<AnalyticsDashboard> {
    const dashboard = await this.getDashboardById(dashboardId);
    dashboard.removeWidget(widgetId);
    return await this.analyticsRepository.saveDashboard(dashboard);
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<CreateDashboardDto['widgets'][0]>,
  ): Promise<AnalyticsDashboard> {
    const dashboard = await this.getDashboardById(dashboardId);
    dashboard.updateWidget(widgetId, updates);
    return await this.analyticsRepository.saveDashboard(dashboard);
  }

  // Analytics Data Processing
  async getAnalyticsData(query: AnalyticsQuery): Promise<any> {
    this.logger.log(`Processing analytics query for metrics: ${query.metrics.join(', ')}`);

    try {
      const data = await this.analyticsRepository.getAnalyticsData(query);
      return this.processAnalyticsData(data, query);
    } catch (error) {
      this.logger.error(`Failed to get analytics data: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateReport(reportId: string): Promise<any> {
    const report = await this.getReportById(reportId);

    const query: AnalyticsQuery = {
      metrics: report.metrics,
      filters: report.filters,
      period: report.period,
    };

    const data = await this.getAnalyticsData(query);

    return {
      reportId: report.id,
      reportName: report.name,
      generatedAt: new Date(),
      data,
      summary: this.generateReportSummary(data),
    };
  }

  async getDashboardData(dashboardId: string): Promise<any> {
    const dashboard = await this.getDashboardById(dashboardId);

    const widgetData = await Promise.all(
      dashboard.widgets.map(async (widget) => {
        const query = this.buildWidgetQuery(widget);
        const data = await this.getAnalyticsData(query);
        return {
          widgetId: widget.id,
          type: widget.type,
          title: widget.title,
          data,
        };
      }),
    );

    return {
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
      generatedAt: new Date(),
      widgets: widgetData,
    };
  }

  async getRealTimeMetrics(): Promise<any> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const query: AnalyticsQuery = {
      metrics: ['delivery_rate', 'open_rate', 'click_rate'],
      filters: {
        dateRange: {
          startDate: oneHourAgo,
          endDate: now,
        },
      },
      period: AnalyticsPeriod.HOUR,
    };

    return await this.getAnalyticsData(query);
  }

  async getPerformanceMetrics(timeframe: string): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        throw new BadRequestException('Invalid timeframe');
    }

    const query: AnalyticsQuery = {
      metrics: ['delivery_rate', 'open_rate', 'click_rate', 'conversion_rate', 'bounce_rate'],
      filters: {
        dateRange: {
          startDate,
          endDate: now,
        },
      },
      period: timeframe === '24h' ? AnalyticsPeriod.HOUR : AnalyticsPeriod.DAY,
    };

    return await this.getAnalyticsData(query);
  }

  private processAnalyticsData(data: any, query: AnalyticsQuery): any {
    // Process and aggregate analytics data
    const processed: any = {
      metrics: {},
      trends: {},
      insights: [],
    };

    // Calculate metrics
    for (const metric of query.metrics) {
      processed.metrics[metric] = this.calculateMetricValue(data, metric);
    }

    // Calculate trends
    processed.trends = this.calculateTrends(data, query);

    // Generate insights
    processed.insights = this.generateInsights(processed.metrics, processed.trends);

    return processed;
  }

  private calculateMetricValue(data: any, metric: string): number {
    // Implement metric calculation logic
    return data[metric] || 0;
  }

  private calculateTrends(data: any, query: AnalyticsQuery): any {
    // Implement trend calculation logic
    return {
      delivery: { change: 0, direction: 'stable' },
      open: { change: 0, direction: 'stable' },
      click: { change: 0, direction: 'stable' },
    };
  }

  private generateInsights(metrics: any, trends: any): string[] {
    const insights = [];

    if (metrics.delivery_rate > 0.95) {
      insights.push('Excellent delivery rate - system performing optimally');
    }

    if (metrics.open_rate > 0.3) {
      insights.push('Good open rate - content is engaging users');
    }

    if (metrics.click_rate > 0.1) {
      insights.push('Strong click rate - call-to-actions are effective');
    }

    return insights;
  }

  private generateReportSummary(data: any): any {
    return {
      totalMetrics: Object.keys(data.metrics).length,
      keyInsights: data.insights.slice(0, 3),
      performanceScore: this.calculatePerformanceScore(data.metrics),
    };
  }

  private calculatePerformanceScore(metrics: any): number {
    // Calculate overall performance score
    const weights = {
      delivery_rate: 0.3,
      open_rate: 0.3,
      click_rate: 0.2,
      conversion_rate: 0.2,
    };

    let score = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      score += (metrics[metric] || 0) * weight;
    }

    return Math.round(score * 100);
  }

  private buildWidgetQuery(widget: any): AnalyticsQuery {
    // Build query based on widget configuration
    return {
      metrics: widget.config.metrics || ['delivery_rate'],
      filters: widget.config.filters || {
        dateRange: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
      },
      period: widget.config.period || AnalyticsPeriod.DAY,
    };
  }
}
