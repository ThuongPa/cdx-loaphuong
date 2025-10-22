import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from '../../infrastructure/analytics.repository';
import { AnalyticsMetric, AnalyticsMetricType } from '../../domain/analytics.entity';
import { AnalyticsReport, AnalyticsPeriod } from '../../domain/analytics.entity';
import { AnalyticsDashboard } from '../../domain/analytics.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let analyticsRepository: jest.Mocked<AnalyticsRepository>;

  beforeEach(async () => {
    const mockAnalyticsRepository = {
      saveMetric: jest.fn(),
      findMetricById: jest.fn(),
      findMetrics: jest.fn(),
      deleteMetric: jest.fn(),
      saveReport: jest.fn(),
      findReportById: jest.fn(),
      findReports: jest.fn(),
      deleteReport: jest.fn(),
      saveDashboard: jest.fn(),
      findDashboardById: jest.fn(),
      findDashboards: jest.fn(),
      deleteDashboard: jest.fn(),
      getAnalyticsData: jest.fn(),
      saveAnalyticsData: jest.fn(),
      getRealTimeData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: 'AnalyticsRepository',
          useValue: mockAnalyticsRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    analyticsRepository = module.get('AnalyticsRepository');
  });

  describe('createMetric', () => {
    it('should create an analytics metric successfully', async () => {
      const createDto = {
        name: 'Delivery Rate',
        type: AnalyticsMetricType.DELIVERY,
        description: 'Percentage of successfully delivered notifications',
      };

      const mockMetric = AnalyticsMetric.create({
        name: 'Delivery Rate',
        type: AnalyticsMetricType.DELIVERY,
        description: 'Percentage of successfully delivered notifications',
        isActive: true,
      });

      analyticsRepository.saveMetric.mockResolvedValue(mockMetric);

      const result = await service.createMetric(createDto, 'user123');

      expect(result).toEqual(mockMetric);
      expect(analyticsRepository.saveMetric).toHaveBeenCalled();
    });
  });

  describe('getMetricById', () => {
    it('should return analytics metric if found', async () => {
      const mockMetric = AnalyticsMetric.create({
        name: 'Test Metric',
        type: AnalyticsMetricType.DELIVERY,
        isActive: true,
      });

      analyticsRepository.findMetricById.mockResolvedValue(mockMetric);

      const result = await service.getMetricById('metric123');

      expect(result).toEqual(mockMetric);
      expect(analyticsRepository.findMetricById).toHaveBeenCalledWith('metric123');
    });

    it('should throw NotFoundException if metric not found', async () => {
      analyticsRepository.findMetricById.mockResolvedValue(null);

      await expect(service.getMetricById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMetric', () => {
    it('should update analytics metric successfully', async () => {
      const mockMetric = AnalyticsMetric.create({
        name: 'Test Metric',
        type: AnalyticsMetricType.DELIVERY,
        isActive: true,
      });

      const updates = {
        name: 'Updated Metric',
        description: 'Updated description',
      };

      analyticsRepository.findMetricById.mockResolvedValue(mockMetric);
      const updatedMetric = AnalyticsMetric.create({
        name: 'Updated Metric',
        type: AnalyticsMetricType.DELIVERY,
        description: 'Updated description',
        isActive: true,
      });
      analyticsRepository.saveMetric.mockResolvedValue(updatedMetric);

      const result = await service.updateMetric('metric123', updates);

      expect(result).toEqual(updatedMetric);
      expect(analyticsRepository.saveMetric).toHaveBeenCalled();
    });

    it('should throw NotFoundException if metric not found', async () => {
      analyticsRepository.findMetricById.mockResolvedValue(null);

      await expect(service.updateMetric('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMetric', () => {
    it('should delete analytics metric successfully', async () => {
      const mockMetric = AnalyticsMetric.create({
        name: 'Test Metric',
        type: AnalyticsMetricType.DELIVERY,
        isActive: true,
      });

      analyticsRepository.findMetricById.mockResolvedValue(mockMetric);
      analyticsRepository.deleteMetric.mockResolvedValue(undefined);

      await service.deleteMetric('metric123');

      expect(analyticsRepository.findMetricById).toHaveBeenCalledWith('metric123');
      expect(analyticsRepository.deleteMetric).toHaveBeenCalledWith('metric123');
    });

    it('should throw NotFoundException if metric not found', async () => {
      analyticsRepository.findMetricById.mockResolvedValue(null);

      await expect(service.deleteMetric('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateMetric', () => {
    it('should activate analytics metric successfully', async () => {
      const mockMetric = AnalyticsMetric.create({
        name: 'Test Metric',
        type: AnalyticsMetricType.DELIVERY,
        isActive: false,
      });

      analyticsRepository.findMetricById.mockResolvedValue(mockMetric);
      analyticsRepository.saveMetric.mockResolvedValue(mockMetric);

      const result = await service.activateMetric('metric123');

      expect(result.isActive).toBe(true);
      expect(analyticsRepository.saveMetric).toHaveBeenCalled();
    });

    it('should throw NotFoundException if metric not found', async () => {
      analyticsRepository.findMetricById.mockResolvedValue(null);

      await expect(service.activateMetric('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateMetric', () => {
    it('should deactivate analytics metric successfully', async () => {
      const mockMetric = AnalyticsMetric.create({
        name: 'Test Metric',
        type: AnalyticsMetricType.DELIVERY,
        isActive: true,
      });

      analyticsRepository.findMetricById.mockResolvedValue(mockMetric);
      analyticsRepository.saveMetric.mockResolvedValue(mockMetric);

      const result = await service.deactivateMetric('metric123');

      expect(result.isActive).toBe(false);
      expect(analyticsRepository.saveMetric).toHaveBeenCalled();
    });

    it('should throw NotFoundException if metric not found', async () => {
      analyticsRepository.findMetricById.mockResolvedValue(null);

      await expect(service.deactivateMetric('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createReport', () => {
    it('should create an analytics report successfully', async () => {
      const createDto = {
        name: 'Weekly Report',
        description: 'Weekly analytics report',
        metrics: ['delivery_rate', 'open_rate'],
        filters: {
          dateRange: {
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-01-07'),
          },
        },
        period: AnalyticsPeriod.WEEK,
        recipients: ['admin@example.com'],
      };

      const mockReport = AnalyticsReport.create({
        name: 'Weekly Report',
        description: 'Weekly analytics report',
        metrics: ['delivery_rate', 'open_rate'],
        filters: createDto.filters,
        period: AnalyticsPeriod.WEEK,
        isScheduled: false,
        recipients: ['admin@example.com'],
        createdBy: 'user123',
      });

      analyticsRepository.saveReport.mockResolvedValue(mockReport);

      const result = await service.createReport(createDto, 'user123');

      expect(result).toEqual(mockReport);
      expect(analyticsRepository.saveReport).toHaveBeenCalled();
    });
  });

  describe('getReportById', () => {
    it('should return analytics report if found', async () => {
      const mockReport = AnalyticsReport.create({
        name: 'Test Report',
        metrics: ['delivery_rate'],
        filters: {
          dateRange: {
            startDate: new Date(),
            endDate: new Date(),
          },
        },
        period: AnalyticsPeriod.DAY,
        isScheduled: false,
        recipients: [],
        createdBy: 'user123',
      });

      analyticsRepository.findReportById.mockResolvedValue(mockReport);

      const result = await service.getReportById('report123');

      expect(result).toEqual(mockReport);
      expect(analyticsRepository.findReportById).toHaveBeenCalledWith('report123');
    });

    it('should throw NotFoundException if report not found', async () => {
      analyticsRepository.findReportById.mockResolvedValue(null);

      await expect(service.getReportById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDashboard', () => {
    it('should create an analytics dashboard successfully', async () => {
      const createDto = {
        name: 'Main Dashboard',
        description: 'Main analytics dashboard',
        widgets: [
          {
            type: 'chart' as const,
            title: 'Delivery Rate',
            config: { metric: 'delivery_rate' },
            position: { x: 0, y: 0, width: 6, height: 4 },
          },
        ],
        isPublic: true,
      };

      const mockDashboard = AnalyticsDashboard.create({
        name: 'Main Dashboard',
        description: 'Main analytics dashboard',
        widgets: createDto.widgets.map((widget, index) => ({
          ...widget,
          id: `widget_${Date.now()}_${index}`,
        })),
        isPublic: true,
        createdBy: 'user123',
      });

      analyticsRepository.saveDashboard.mockResolvedValue(mockDashboard);

      const result = await service.createDashboard(createDto, 'user123');

      expect(result).toEqual(mockDashboard);
      expect(analyticsRepository.saveDashboard).toHaveBeenCalled();
    });
  });

  describe('getDashboardById', () => {
    it('should return analytics dashboard if found', async () => {
      const mockDashboard = AnalyticsDashboard.create({
        name: 'Test Dashboard',
        widgets: [],
        isPublic: false,
        createdBy: 'user123',
      });

      analyticsRepository.findDashboardById.mockResolvedValue(mockDashboard);

      const result = await service.getDashboardById('dashboard123');

      expect(result).toEqual(mockDashboard);
      expect(analyticsRepository.findDashboardById).toHaveBeenCalledWith('dashboard123');
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      analyticsRepository.findDashboardById.mockResolvedValue(null);

      await expect(service.getDashboardById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAnalyticsData', () => {
    it('should process analytics data successfully', async () => {
      const query = {
        metrics: ['delivery_rate', 'open_rate'],
        filters: {
          dateRange: {
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-01-07'),
          },
        },
        period: AnalyticsPeriod.DAY,
      };

      const mockData = {
        delivery_rate: 0.95,
        open_rate: 0.25,
        click_rate: 0.1,
      };

      analyticsRepository.getAnalyticsData.mockResolvedValue(mockData);

      const result = await service.getAnalyticsData(query);

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('insights');
      expect(analyticsRepository.getAnalyticsData).toHaveBeenCalledWith(query);
    });
  });

  describe('generateReport', () => {
    it('should generate report successfully', async () => {
      const mockReport = AnalyticsReport.create({
        name: 'Test Report',
        metrics: ['delivery_rate', 'open_rate'],
        filters: {
          dateRange: {
            startDate: new Date(),
            endDate: new Date(),
          },
        },
        period: AnalyticsPeriod.DAY,
        isScheduled: false,
        recipients: [],
        createdBy: 'user123',
      });

      const mockData = {
        metrics: { delivery_rate: 0.95, open_rate: 0.25 },
        trends: { delivery: { change: 0, direction: 'stable' } },
        insights: ['Good performance'],
      };

      analyticsRepository.findReportById.mockResolvedValue(mockReport);
      analyticsRepository.getAnalyticsData.mockResolvedValue(mockData);

      const result = await service.generateReport('report123');

      expect(result).toHaveProperty('reportId');
      expect(result).toHaveProperty('reportName');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('summary');
    });

    it('should throw NotFoundException if report not found', async () => {
      analyticsRepository.findReportById.mockResolvedValue(null);

      await expect(service.generateReport('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should return real-time metrics successfully', async () => {
      const mockData = {
        metrics: { delivery_rate: 0.95, open_rate: 0.25, click_rate: 0.1 },
        trends: {},
        insights: [],
      };

      analyticsRepository.getAnalyticsData.mockResolvedValue(mockData);

      const result = await service.getRealTimeMetrics();

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('insights');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics for 24h timeframe', async () => {
      const mockData = {
        delivery_rate: 0.95,
        open_rate: 0.25,
        click_rate: 0.1,
        conversion_rate: 0.05,
        bounce_rate: 0.02,
      };

      analyticsRepository.getAnalyticsData.mockResolvedValue(mockData);

      const result = await service.getPerformanceMetrics('24h');

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('insights');
    });

    it('should return performance metrics for 7d timeframe', async () => {
      const mockData = {
        delivery_rate: 0.95,
        open_rate: 0.25,
        click_rate: 0.1,
        conversion_rate: 0.05,
        bounce_rate: 0.02,
      };

      analyticsRepository.getAnalyticsData.mockResolvedValue(mockData);

      const result = await service.getPerformanceMetrics('7d');

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('insights');
    });

    it('should return performance metrics for 30d timeframe', async () => {
      const mockData = {
        delivery_rate: 0.95,
        open_rate: 0.25,
        click_rate: 0.1,
        conversion_rate: 0.05,
        bounce_rate: 0.02,
      };

      analyticsRepository.getAnalyticsData.mockResolvedValue(mockData);

      const result = await service.getPerformanceMetrics('30d');

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('insights');
    });

    it('should throw BadRequestException for invalid timeframe', async () => {
      await expect(service.getPerformanceMetrics('invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('addWidget', () => {
    it('should add widget to dashboard successfully', async () => {
      const mockDashboard = AnalyticsDashboard.create({
        name: 'Test Dashboard',
        widgets: [],
        isPublic: false,
        createdBy: 'user123',
      });

      const widget = {
        type: 'chart' as const,
        title: 'New Widget',
        config: { metric: 'delivery_rate' },
        position: { x: 0, y: 0, width: 6, height: 4 },
      };

      analyticsRepository.findDashboardById.mockResolvedValue(mockDashboard);
      analyticsRepository.saveDashboard.mockResolvedValue(mockDashboard);

      const result = await service.addWidget('dashboard123', widget);

      expect(result).toBeDefined();
      expect(analyticsRepository.saveDashboard).toHaveBeenCalled();
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      analyticsRepository.findDashboardById.mockResolvedValue(null);

      await expect(service.addWidget('nonexistent', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeWidget', () => {
    it('should remove widget from dashboard successfully', async () => {
      const mockDashboard = AnalyticsDashboard.create({
        name: 'Test Dashboard',
        widgets: [
          {
            id: 'widget123',
            type: 'chart',
            title: 'Test Widget',
            config: {},
            position: { x: 0, y: 0, width: 6, height: 4 },
          },
        ],
        isPublic: false,
        createdBy: 'user123',
      });

      analyticsRepository.findDashboardById.mockResolvedValue(mockDashboard);
      analyticsRepository.saveDashboard.mockResolvedValue(mockDashboard);

      const result = await service.removeWidget('dashboard123', 'widget123');

      expect(result).toBeDefined();
      expect(analyticsRepository.saveDashboard).toHaveBeenCalled();
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      analyticsRepository.findDashboardById.mockResolvedValue(null);

      await expect(service.removeWidget('nonexistent', 'widget123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
