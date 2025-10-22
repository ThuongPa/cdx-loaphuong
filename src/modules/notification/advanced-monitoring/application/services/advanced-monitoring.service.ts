import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { MonitoringMetric } from '../../domain/monitoring-metric.entity';
import { AdvancedMonitoringRepository } from '../../infrastructure/advanced-monitoring.repository';

export interface CreateMonitoringMetricDto {
  name: string;
  description?: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'custom';
  value: number;
  unit?: string;
  tags: Record<string, string>;
  source: string;
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface UpdateMonitoringMetricDto {
  value?: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
  updatedBy: string;
}

export interface MonitoringMetricFilters {
  names?: string[];
  types?: string[];
  sources?: string[];
  tags?: Record<string, string>;
  dateRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
}

export interface MonitoringDashboard {
  totalMetrics: number;
  metricsByType: Record<string, number>;
  metricsBySource: Record<string, number>;
  topMetrics: Array<{
    name: string;
    value: number;
    unit?: string;
    source: string;
    timestamp: Date;
  }>;
  recentMetrics: Array<{
    name: string;
    value: number;
    unit?: string;
    source: string;
    timestamp: Date;
  }>;
  alerts: Array<{
    metricName: string;
    condition: string;
    value: number;
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }>;
}

@Injectable()
export class AdvancedMonitoringService {
  private readonly logger = new Logger(AdvancedMonitoringService.name);

  constructor(
    @Inject('AdvancedMonitoringRepository')
    private readonly advancedMonitoringRepository: AdvancedMonitoringRepository,
  ) {}

  async createMonitoringMetric(createDto: CreateMonitoringMetricDto): Promise<MonitoringMetric> {
    this.logger.log(`Creating monitoring metric ${createDto.name}`);

    const metricId = `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const monitoringMetric = MonitoringMetric.create({
      metricId,
      name: createDto.name,
      description: createDto.description,
      type: createDto.type,
      value: createDto.value,
      unit: createDto.unit,
      tags: createDto.tags,
      timestamp: new Date(),
      source: createDto.source,
      metadata: createDto.metadata,
      createdBy: createDto.createdBy,
    });

    return this.advancedMonitoringRepository.create(monitoringMetric);
  }

  async getMonitoringMetricById(id: string): Promise<MonitoringMetric> {
    const monitoringMetric = await this.advancedMonitoringRepository.findById(id);
    if (!monitoringMetric) {
      throw new NotFoundException(`Monitoring metric with ID ${id} not found`);
    }
    return monitoringMetric;
  }

  async getMonitoringMetricByMetricId(metricId: string): Promise<MonitoringMetric> {
    const monitoringMetric = await this.advancedMonitoringRepository.findByMetricId(metricId);
    if (!monitoringMetric) {
      throw new NotFoundException(`Monitoring metric with metric ID ${metricId} not found`);
    }
    return monitoringMetric;
  }

  async getMonitoringMetrics(filters: MonitoringMetricFilters = {}): Promise<{
    monitoringMetrics: MonitoringMetric[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.advancedMonitoringRepository.find(filters);
    return result;
  }

  async updateMonitoringMetric(
    id: string,
    updateDto: UpdateMonitoringMetricDto,
  ): Promise<MonitoringMetric> {
    this.logger.log(`Updating monitoring metric ${id}`);

    const monitoringMetric = await this.getMonitoringMetricById(id);

    if (updateDto.value !== undefined) {
      monitoringMetric.updateValue(updateDto.value);
    }

    if (updateDto.tags) {
      monitoringMetric.updateTags(updateDto.tags);
    }

    if (updateDto.metadata) {
      monitoringMetric.updateMetadata(updateDto.metadata);
    }

    return this.advancedMonitoringRepository.update(id, monitoringMetric);
  }

  async deleteMonitoringMetric(id: string): Promise<void> {
    this.logger.log(`Deleting monitoring metric ${id}`);

    const monitoringMetric = await this.getMonitoringMetricById(id);
    await this.advancedMonitoringRepository.delete(id);
  }

  async getMonitoringMetricsBySource(source: string): Promise<MonitoringMetric[]> {
    return this.advancedMonitoringRepository.findBySource(source);
  }

  async getMonitoringMetricsByType(type: string): Promise<MonitoringMetric[]> {
    return this.advancedMonitoringRepository.findByType(type);
  }

  async getMonitoringMetricsByTags(tags: Record<string, string>): Promise<MonitoringMetric[]> {
    return this.advancedMonitoringRepository.findByTags(tags);
  }

  async getMonitoringDashboard(): Promise<MonitoringDashboard> {
    return this.advancedMonitoringRepository.getDashboard();
  }

  async getMonitoringMetricStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    averageValue: number;
    minValue: number;
    maxValue: number;
    recentCount: number;
  }> {
    return this.advancedMonitoringRepository.getStatistics();
  }

  async getMonitoringMetricTrends(
    metricName: string,
    timeRange: { start: Date; end: Date },
    interval: 'minute' | 'hour' | 'day' = 'hour',
  ): Promise<
    Array<{
      timestamp: Date;
      value: number;
      count: number;
    }>
  > {
    return this.advancedMonitoringRepository.getTrends(metricName, timeRange, interval);
  }

  async getMonitoringMetricAlerts(): Promise<
    Array<{
      metricName: string;
      condition: string;
      value: number;
      threshold: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: Date;
    }>
  > {
    return this.advancedMonitoringRepository.getAlerts();
  }

  async createMonitoringMetricAlert(
    metricName: string,
    condition: string,
    threshold: number,
    severity: 'low' | 'medium' | 'high' | 'critical',
  ): Promise<void> {
    this.logger.log(`Creating monitoring alert for metric ${metricName}`);

    await this.advancedMonitoringRepository.createAlert({
      metricName,
      condition,
      threshold,
      severity,
      timestamp: new Date(),
    });
  }

  async cleanupOldMonitoringMetrics(daysOld: number): Promise<{ deletedCount: number }> {
    this.logger.log(`Cleaning up monitoring metrics older than ${daysOld} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.advancedMonitoringRepository.cleanupOld(cutoffDate);
    return result;
  }

  async exportMonitoringMetrics(
    filters: MonitoringMetricFilters,
    format: 'json' | 'csv' | 'excel' = 'json',
  ): Promise<{
    data: any;
    format: string;
    count: number;
    timestamp: Date;
  }> {
    this.logger.log(`Exporting monitoring metrics in ${format} format`);

    const result = await this.advancedMonitoringRepository.export(filters, format);
    return result;
  }

  async getMonitoringMetricHealth(): Promise<{
    isHealthy: boolean;
    status: string;
    metrics: {
      totalMetrics: number;
      activeMetrics: number;
      errorMetrics: number;
      averageValue: number;
      successRate: number;
    };
  }> {
    return this.advancedMonitoringRepository.getHealth();
  }
}
