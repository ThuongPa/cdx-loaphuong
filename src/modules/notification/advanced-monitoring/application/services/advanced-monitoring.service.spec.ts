import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedMonitoringService } from './advanced-monitoring.service';
import { AdvancedMonitoringRepository } from '../../infrastructure/advanced-monitoring.repository';
import { MonitoringMetric } from '../../domain/monitoring-metric.entity';

describe('AdvancedMonitoringService', () => {
  let service: AdvancedMonitoringService;
  let mockRepository: jest.Mocked<AdvancedMonitoringRepository>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByMetricId: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBySource: jest.fn(),
      findByType: jest.fn(),
      findByTags: jest.fn(),
      getDashboard: jest.fn(),
      getStatistics: jest.fn(),
      getTrends: jest.fn(),
      getAlerts: jest.fn(),
      createAlert: jest.fn(),
      cleanupOld: jest.fn(),
      export: jest.fn(),
      getHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedMonitoringService,
        {
          provide: 'AdvancedMonitoringRepository',
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AdvancedMonitoringService>(AdvancedMonitoringService);
    mockRepository = module.get('AdvancedMonitoringRepository');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMonitoringMetric', () => {
    it('should create a monitoring metric', async () => {
      const createDto = {
        name: 'Test Metric',
        description: 'Test metric',
        type: 'counter' as const,
        value: 100,
        unit: 'count',
        tags: { environment: 'test' },
        source: 'test-service',
        metadata: {},
        createdBy: 'test-user',
      };

      const expectedMetric = MonitoringMetric.create({
        metricId: 'generated-id',
        name: 'Test Metric',
        description: 'Test metric',
        type: 'counter',
        value: 100,
        unit: 'count',
        tags: { environment: 'test' },
        timestamp: new Date(),
        source: 'test-service',
        metadata: {},
        createdBy: 'test-user',
      });

      mockRepository.create.mockResolvedValue(expectedMetric);

      const result = await service.createMonitoringMetric(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          description: createDto.description,
          type: createDto.type,
          value: createDto.value,
          unit: createDto.unit,
          tags: createDto.tags,
          source: createDto.source,
          metadata: createDto.metadata,
          createdBy: createDto.createdBy,
        }),
      );
      expect(result).toEqual(expectedMetric);
    });
  });

  describe('getMonitoringMetricById', () => {
    it('should return a monitoring metric by id', async () => {
      const metricId = 'test-id';
      const expectedMetric = MonitoringMetric.create({
        metricId: 'test-metric-1',
        name: 'Test Metric',
        description: 'Test metric',
        type: 'counter',
        value: 100,
        unit: 'count',
        tags: { environment: 'test' },
        timestamp: new Date(),
        source: 'test-service',
        metadata: {},
        createdBy: 'test-user',
      });

      mockRepository.findById.mockResolvedValue(expectedMetric);

      const result = await service.getMonitoringMetricById(metricId);

      expect(mockRepository.findById).toHaveBeenCalledWith(metricId);
      expect(result).toEqual(expectedMetric);
    });

    it('should throw NotFoundException if metric not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getMonitoringMetricById('non-existent-id')).rejects.toThrow(
        'Monitoring metric with ID non-existent-id not found',
      );
    });
  });

  describe('getMonitoringMetrics', () => {
    it('should return paginated monitoring metrics', async () => {
      const filters = {
        names: ['test-metric'],
        types: ['counter'],
        sources: ['test-service'],
        tags: { environment: 'test' },
        dateRange: { start: new Date('2023-01-01'), end: new Date('2023-12-31') },
        limit: 10,
        offset: 0,
      };

      const expectedResult = {
        monitoringMetrics: [
          MonitoringMetric.create({
            metricId: 'test-metric-1',
            name: 'Test Metric 1',
            description: 'Test metric 1',
            type: 'counter',
            value: 100,
            unit: 'count',
            tags: { environment: 'test' },
            timestamp: new Date(),
            source: 'test-service',
            metadata: {},
            createdBy: 'test-user',
          }),
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockRepository.find.mockResolvedValue(expectedResult);

      const result = await service.getMonitoringMetrics(filters);

      expect(mockRepository.find).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateMonitoringMetric', () => {
    it('should update a monitoring metric', async () => {
      const id = 'test-id';
      const updateDto = {
        value: 200,
        tags: { environment: 'updated' },
        metadata: { updated: true },
        updatedBy: 'test-user',
      };

      const existingMetric = MonitoringMetric.create({
        metricId: 'test-metric-1',
        name: 'Test Metric',
        description: 'Test metric',
        type: 'counter',
        value: 100,
        unit: 'count',
        tags: { environment: 'test' },
        timestamp: new Date(),
        source: 'test-service',
        metadata: {},
        createdBy: 'test-user',
      });

      const updatedMetric = MonitoringMetric.create({
        metricId: 'test-metric-1',
        name: 'Test Metric',
        description: 'Test metric',
        type: 'counter',
        value: 200,
        unit: 'count',
        tags: { environment: 'updated' },
        timestamp: new Date(),
        source: 'test-service',
        metadata: { updated: true },
        createdBy: 'test-user',
      });

      mockRepository.findById.mockResolvedValue(existingMetric);
      mockRepository.update.mockResolvedValue(updatedMetric);

      const result = await service.updateMonitoringMetric(id, updateDto);

      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRepository.update).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          value: 200,
          tags: { environment: 'updated' },
          metadata: { updated: true },
        }),
      );
      expect(result).toEqual(updatedMetric);
    });
  });

  describe('deleteMonitoringMetric', () => {
    it('should delete a monitoring metric', async () => {
      const id = 'test-id';
      const existingMetric = MonitoringMetric.create({
        metricId: 'test-metric-1',
        name: 'Test Metric',
        description: 'Test metric',
        type: 'counter',
        value: 100,
        unit: 'count',
        tags: { environment: 'test' },
        timestamp: new Date(),
        source: 'test-service',
        metadata: {},
        createdBy: 'test-user',
      });

      mockRepository.findById.mockResolvedValue(existingMetric);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.deleteMonitoringMetric(id);

      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(mockRepository.delete).toHaveBeenCalledWith(id);
    });
  });

  describe('getMonitoringDashboard', () => {
    it('should return dashboard data', async () => {
      const expectedDashboard = {
        totalMetrics: 100,
        metricsByType: { counter: 50, gauge: 30, histogram: 20 },
        metricsBySource: { 'service-1': 40, 'service-2': 35, 'service-3': 25 },
        topMetrics: [
          {
            name: 'test-metric',
            value: 100,
            unit: 'count',
            source: 'test-service',
            timestamp: new Date(),
          },
        ],
        recentMetrics: [
          {
            name: 'recent-metric',
            value: 50,
            unit: 'count',
            source: 'test-service',
            timestamp: new Date(),
          },
        ],
        alerts: [
          {
            metricName: 'test-metric',
            condition: 'greater_than',
            value: 1000,
            threshold: 500,
            severity: 'high' as const,
            timestamp: new Date(),
          },
        ],
      };

      mockRepository.getDashboard.mockResolvedValue(expectedDashboard);

      const result = await service.getMonitoringDashboard();

      expect(mockRepository.getDashboard).toHaveBeenCalled();
      expect(result).toEqual(expectedDashboard);
    });
  });

  describe('getMonitoringMetricStatistics', () => {
    it('should return statistics data', async () => {
      const expectedStats = {
        total: 100,
        byType: { counter: 50, gauge: 30, histogram: 20 },
        bySource: { 'service-1': 40, 'service-2': 35, 'service-3': 25 },
        averageValue: 75.5,
        minValue: 0,
        maxValue: 1000,
        recentCount: 10,
      };

      mockRepository.getStatistics.mockResolvedValue(expectedStats);

      const result = await service.getMonitoringMetricStatistics();

      expect(mockRepository.getStatistics).toHaveBeenCalled();
      expect(result).toEqual(expectedStats);
    });
  });

  describe('getMonitoringMetricTrends', () => {
    it('should return trends data', async () => {
      const metricName = 'test-metric';
      const timeRange = { start: new Date('2023-01-01'), end: new Date('2023-01-31') };
      const interval = 'day' as const;

      const expectedTrends = [
        { timestamp: new Date('2023-01-01'), value: 100, count: 1 },
        { timestamp: new Date('2023-01-02'), value: 150, count: 2 },
      ];

      mockRepository.getTrends.mockResolvedValue(expectedTrends);

      const result = await service.getMonitoringMetricTrends(metricName, timeRange, interval);

      expect(mockRepository.getTrends).toHaveBeenCalledWith(metricName, timeRange, interval);
      expect(result).toEqual(expectedTrends);
    });
  });

  describe('getMonitoringMetricAlerts', () => {
    it('should return alerts', async () => {
      const expectedAlerts = [
        {
          metricName: 'test-metric',
          condition: 'greater_than',
          value: 1000,
          threshold: 500,
          severity: 'high' as const,
          timestamp: new Date(),
        },
      ];

      mockRepository.getAlerts.mockResolvedValue(expectedAlerts);

      const result = await service.getMonitoringMetricAlerts();

      expect(mockRepository.getAlerts).toHaveBeenCalled();
      expect(result).toEqual(expectedAlerts);
    });
  });

  describe('createMonitoringMetricAlert', () => {
    it('should create an alert', async () => {
      const metricName = 'test-metric';
      const condition = 'greater_than';
      const threshold = 500;
      const severity = 'high' as const;

      mockRepository.createAlert.mockResolvedValue(undefined);

      await service.createMonitoringMetricAlert(metricName, condition, threshold, severity);

      expect(mockRepository.createAlert).toHaveBeenCalledWith({
        metricName,
        condition,
        threshold,
        severity,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('cleanupOldMonitoringMetrics', () => {
    it('should cleanup old metrics', async () => {
      const daysOld = 30;
      const expectedResult = { deletedCount: 50 };

      mockRepository.cleanupOld.mockResolvedValue(expectedResult);

      const result = await service.cleanupOldMonitoringMetrics(daysOld);

      expect(mockRepository.cleanupOld).toHaveBeenCalledWith(expect.any(Date));
      expect(result).toEqual(expectedResult);
    });
  });

  describe('exportMonitoringMetrics', () => {
    it('should export metrics', async () => {
      const filters = { names: ['test-metric'], limit: 100, offset: 0 };
      const format = 'json' as const;

      const expectedResult = {
        data: [
          {
            metricId: 'test-metric-1',
            name: 'Test Metric',
            description: 'Test metric',
            type: 'counter',
            value: 100,
            unit: 'count',
            tags: { environment: 'test' },
            timestamp: new Date(),
            source: 'test-service',
            metadata: {},
            createdBy: 'test-user',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        format: 'json',
        count: 1,
        timestamp: new Date(),
      };

      mockRepository.export.mockResolvedValue(expectedResult);

      const result = await service.exportMonitoringMetrics(filters, format);

      expect(mockRepository.export).toHaveBeenCalledWith(filters, format);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMonitoringMetricHealth', () => {
    it('should return health status', async () => {
      const expectedHealth = {
        isHealthy: true,
        status: 'healthy',
        metrics: {
          totalMetrics: 100,
          activeMetrics: 95,
          errorMetrics: 5,
          averageValue: 75.5,
          successRate: 95,
        },
      };

      mockRepository.getHealth.mockResolvedValue(expectedHealth);

      const result = await service.getMonitoringMetricHealth();

      expect(mockRepository.getHealth).toHaveBeenCalled();
      expect(result).toEqual(expectedHealth);
    });
  });
});
