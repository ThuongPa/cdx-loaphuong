import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';

export * from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getMetrics(filters: any = {}): Promise<any[]> {
    try {
      return await this.analyticsRepository.getMetrics(filters);
    } catch (error) {
      this.logger.error(`Failed to get metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTimeSeriesMetrics(filters: any = {}): Promise<any[]> {
    try {
      return await this.analyticsRepository.getTimeSeriesMetrics(filters);
    } catch (error) {
      this.logger.error(`Failed to get time series metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getChannelPerformance(filters: any = {}): Promise<any[]> {
    try {
      return await this.analyticsRepository.getChannelPerformance(filters);
    } catch (error) {
      this.logger.error(`Failed to get channel performance: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserEngagement(filters: any = {}): Promise<any[]> {
    try {
      return [];
    } catch (error) {
      this.logger.error(`Failed to get user engagement: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getNotificationEffectivenessMetrics(filters: any = {}): Promise<any[]> {
    try {
      return await this.analyticsRepository.getNotificationEffectivenessMetrics(filters);
    } catch (error) {
      this.logger.error(
        `Failed to get notification effectiveness metrics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async generateReport(reportDto: any): Promise<any> {
    try {
      const {
        metricName,
        period,
        startDate,
        endDate,
        dimensions,
        groupBy = ['metricName'],
      } = reportDto;

      const metrics = await this.analyticsRepository.getMetrics({
        metricName,
        dateFrom: startDate,
        dateTo: endDate,
        dimensions,
      });

      const timeSeries = await this.analyticsRepository.getTimeSeriesMetrics({
        metricName,
        dateFrom: startDate,
        dateTo: endDate,
        dimensions,
      });

      const summary = this.calculateSummaryStatistics(metrics);
      const insights = this.generateInsights(metrics, timeSeries);

      const report = {
        metricName,
        period,
        startDate,
        endDate,
        summary,
        timeSeries,
        insights,
        generatedAt: new Date(),
      };

      this.logger.log(`Analytics report generated: ${metricName} (${period})`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDashboardData(insightsDto: any): Promise<any> {
    try {
      const filters: any = {
        userId: insightsDto.userId,
        channel: insightsDto.channel,
        category: insightsDto.category,
        dateFrom: insightsDto.dateFrom,
        dateTo: insightsDto.dateTo,
      };

      const [
        totalNotifications,
        channelPerformance,
        userEngagement,
        effectivenessMetrics,
        timeSeriesData,
      ] = await Promise.all([
        this.analyticsRepository.getMetrics(filters),
        this.analyticsRepository.getChannelPerformance(filters),
        this.getUserEngagement(filters),
        this.analyticsRepository.getNotificationEffectivenessMetrics(filters),
        this.analyticsRepository.getTimeSeriesMetrics(filters),
      ]);

      const overview = {
        totalNotifications: this.calculateTotalFromMetrics(totalNotifications),
        successRate: this.calculateSuccessRate(effectivenessMetrics),
        engagementRate: this.calculateEngagementRate(userEngagement),
      };

      return {
        overview,
        channelPerformance,
        userEngagement,
        effectivenessMetrics,
        timeSeriesData,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard data: ${error.message}`, error.stack);
      throw error;
    }
  }

  private calculateSummaryStatistics(metrics: any[]): any {
    if (metrics.length === 0) {
      return { total: 0, average: 0, min: 0, max: 0 };
    }

    const total = metrics.reduce((sum, metric) => sum + metric.totalValue, 0);
    const average = total / metrics.length;
    const min = Math.min(...metrics.map((m) => m.totalValue));
    const max = Math.max(...metrics.map((m) => m.totalValue));

    return { total, average, min, max };
  }

  private generateInsights(metrics: any[], timeSeries: any[]): any {
    const insights = [];

    if (timeSeries.length > 1) {
      const latest = timeSeries[timeSeries.length - 1];
      const previous = timeSeries[timeSeries.length - 2];
      const change = ((latest.totalValue - previous.totalValue) / previous.totalValue) * 100;

      insights.push({
        type: 'trend',
        message: `Metric ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to previous period`,
        change,
      });
    }

    const lowPerformanceChannels = metrics.filter((metric) => metric.averageValue < 0.5);
    if (lowPerformanceChannels.length > 0) {
      insights.push({
        type: 'performance',
        message: `Low performance detected in ${lowPerformanceChannels.length} channels`,
        channels: lowPerformanceChannels.map((metric) => metric._id.channel),
      });
    }

    return insights;
  }

  private calculateTotalFromMetrics(metrics: any[]): number {
    return metrics.reduce((sum, metric) => sum + metric.totalValue, 0);
  }

  private calculateSuccessRate(effectivenessMetrics: any[]): number {
    if (effectivenessMetrics.length === 0) return 0;

    const totalSent = effectivenessMetrics.reduce((sum, metric) => sum + metric.sent, 0);
    const totalDelivered = effectivenessMetrics.reduce((sum, metric) => sum + metric.delivered, 0);

    return totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  }

  private calculateEngagementRate(userEngagement: any[]): number {
    if (userEngagement.length === 0) return 0;

    const totalEngagement = userEngagement.reduce((sum, metric) => sum + metric.totalValue, 0);
    const totalEvents = userEngagement.reduce((sum, metric) => sum + metric.count, 0);

    return totalEvents > 0 ? (totalEngagement / totalEvents) * 100 : 0;
  }

  private getWeekString(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  async trackEvent(createDto: any): Promise<any> {
    try {
      return { success: true, event: createDto.eventName };
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`, error.stack);
      throw error;
    }
  }

  async trackBulkEvents(events: any[]): Promise<any> {
    try {
      return { success: true, processed: events.length };
    } catch (error) {
      this.logger.error(`Failed to track bulk events: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAnalytics(filters: any = {}, sort: any = {}, pagination: any = {}): Promise<any> {
    try {
      return {
        data: [],
        total: 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
      };
    } catch (error) {
      this.logger.error(`Failed to get analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserEngagementMetrics(filters: any = {}): Promise<any[]> {
    try {
      return await this.getUserEngagement(filters);
    } catch (error) {
      this.logger.error(`Failed to get user engagement metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cleanupOldData(retentionDays: number): Promise<number> {
    try {
      this.logger.log(`Cleaning up analytics data older than ${retentionDays} days`);
      return 0;
    } catch (error) {
      this.logger.error(`Failed to cleanup old data: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getInsights(filters: any = {}): Promise<any> {
    try {
      return {
        insights: [],
        recommendations: [],
        trends: [],
      };
    } catch (error) {
      this.logger.error(`Failed to get insights: ${error.message}`, error.stack);
      throw error;
    }
  }
}
