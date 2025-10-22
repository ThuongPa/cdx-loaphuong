import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoDBBulkService } from '../../src/infrastructure/performance/mongodb-bulk.service';
import { PrometheusService } from '../../src/infrastructure/monitoring/prometheus.service';
import { StructuredLoggerService } from '../../src/infrastructure/logging/structured-logger.service';

describe('MongoDBBulkService Performance Tests', () => {
  let service: MongoDBBulkService;
  let connection: Connection;
  let prometheusService: PrometheusService;
  let structuredLogger: StructuredLoggerService;

  const mockConnection = {
    collection: jest.fn(),
    db: {
      listCollections: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ name: 'notifications' }, { name: 'users' }]),
      }),
    },
  };

  const mockCollection = {
    insertMany: jest.fn(),
    bulkWrite: jest.fn(),
    indexes: jest.fn(),
    stats: jest.fn(),
    createIndex: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoDBBulkService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: PrometheusService,
          useValue: {
            recordDatabaseQueryDuration: jest.fn(),
          },
        },
        {
          provide: StructuredLoggerService,
          useValue: {
            logDatabaseQuery: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MongoDBBulkService>(MongoDBBulkService);
    connection = module.get<Connection>(getConnectionToken());
    prometheusService = module.get<PrometheusService>(PrometheusService);
    structuredLogger = module.get<StructuredLoggerService>(StructuredLoggerService);

    // Setup mock collection
    mockConnection.collection.mockReturnValue(mockCollection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bulk Insert Performance', () => {
    it('should handle large bulk insert operations efficiently', async () => {
      const documents = Array.from({ length: 1000 }, (_, i) => ({
        _id: `doc_${i}`,
        userId: `user_${i}`,
        type: 'test',
        title: `Test Notification ${i}`,
        body: `Test body ${i}`,
        createdAt: new Date(),
      }));

      mockCollection.insertMany.mockResolvedValue({
        insertedCount: 1000,
        insertedIds: {},
      });

      const startTime = Date.now();
      const result = await service.executeBulkOperation({
        operation: 'insert',
        collection: 'notifications',
        documents,
      });
      const endTime = Date.now();

      expect(result.successful).toBe(1000);
      expect(result.failed).toBe(0);
      expect(result.duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);

      expect(mockCollection.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            _id: expect.any(String),
            userId: expect.any(String),
            type: 'test',
          }),
        ]),
        { ordered: false },
      );
    });

    it('should handle bulk insert with partial failures', async () => {
      const documents = Array.from({ length: 100 }, (_, i) => ({
        _id: `doc_${i}`,
        userId: `user_${i}`,
        type: 'test',
        title: `Test Notification ${i}`,
        body: `Test body ${i}`,
        createdAt: new Date(),
      }));

      const error = new Error('Duplicate key error');
      (error as any).writeErrors = [{ index: 50, code: 11000, errmsg: 'Duplicate key' }];
      (error as any).result = { insertedCount: 99 };

      mockCollection.insertMany.mockRejectedValue(error);

      await expect(
        service.executeBulkOperation({
          operation: 'insert',
          collection: 'notifications',
          documents,
        }),
      ).rejects.toThrow('Duplicate key error');
    });
  });

  describe('Bulk Update Performance', () => {
    it('should handle large bulk update operations efficiently', async () => {
      const documents = Array.from({ length: 500 }, (_, i) => ({
        _id: `doc_${i}`,
        userId: `user_${i}`,
        status: 'updated',
        updatedAt: new Date(),
      }));

      mockCollection.bulkWrite.mockResolvedValue({
        modifiedCount: 500,
        matchedCount: 500,
      });

      const startTime = Date.now();
      const result = await service.executeBulkOperation({
        operation: 'update',
        collection: 'notifications',
        documents,
        filter: { status: 'pending' },
        update: { $set: { status: 'processed' } },
      });
      const endTime = Date.now();

      expect(result.successful).toBe(500);
      expect(result.failed).toBe(0);
      expect(result.duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(endTime - startTime).toBeLessThan(3000);

      expect(mockCollection.bulkWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            updateOne: expect.objectContaining({
              filter: expect.any(Object),
              update: expect.any(Object),
            }),
          }),
        ]),
        { ordered: false },
      );
    });
  });

  describe('Bulk Delete Performance', () => {
    it('should handle large bulk delete operations efficiently', async () => {
      const documents = Array.from({ length: 200 }, (_, i) => ({
        _id: `doc_${i}`,
        userId: `user_${i}`,
      }));

      mockCollection.bulkWrite.mockResolvedValue({
        deletedCount: 200,
      });

      const startTime = Date.now();
      const result = await service.executeBulkOperation({
        operation: 'delete',
        collection: 'notifications',
        documents,
        filter: { status: 'archived' },
      });
      const endTime = Date.now();

      expect(result.successful).toBe(200);
      expect(result.failed).toBe(0);
      expect(result.duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Collection Optimization Performance', () => {
    it('should optimize collection efficiently', async () => {
      mockCollection.indexes.mockResolvedValue([{ name: '_id_' }, { name: 'userId_1' }]);

      mockCollection.stats.mockResolvedValue({
        count: 10000,
        size: 1024000,
        avgObjSize: 102.4,
        storageSize: 2048000,
        totalIndexSize: 512000,
        indexSizes: {
          _id_: 256000,
          userId_1: 256000,
        },
      });

      mockCollection.createIndex.mockResolvedValue('createdAt_1');

      const startTime = Date.now();
      const result = await service.optimizeCollection('notifications');
      const endTime = Date.now();

      expect(result.optimized).toBe(true);
      expect(result.indexes).toContain('_id_');
      expect(result.indexes).toContain('userId_1');
      expect(result.stats).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Collection Statistics Performance', () => {
    it('should get collection statistics efficiently', async () => {
      mockCollection.stats.mockResolvedValue({
        count: 5000,
        size: 512000,
        avgObjSize: 102.4,
        storageSize: 1024000,
        totalIndexSize: 256000,
        indexSizes: {
          _id_: 128000,
          userId_1: 128000,
        },
      });

      const startTime = Date.now();
      const result = await service.getCollectionStats('notifications');
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.name).toBe('notifications');
      expect(result.count).toBe(5000);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should get all collections statistics efficiently', async () => {
      mockCollection.stats
        .mockResolvedValueOnce({
          count: 5000,
          size: 512000,
          avgObjSize: 102.4,
          storageSize: 1024000,
          totalIndexSize: 256000,
          indexSizes: { _id_: 128000, userId_1: 128000 },
        })
        .mockResolvedValueOnce({
          count: 1000,
          size: 102400,
          avgObjSize: 102.4,
          storageSize: 204800,
          totalIndexSize: 51200,
          indexSizes: { _id_: 25600, email_1: 25600 },
        });

      const startTime = Date.now();
      const result = await service.getAllCollectionsStats();
      const endTime = Date.now();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('notifications');
      expect(result[1].name).toBe('users');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently without performance degradation', async () => {
      const documents = Array.from({ length: 100 }, (_, i) => ({
        _id: `doc_${i}`,
        userId: `user_${i}`,
        type: 'test',
      }));

      mockCollection.insertMany.mockRejectedValue(new Error('Connection timeout'));

      const startTime = Date.now();
      await expect(
        service.executeBulkOperation({
          operation: 'insert',
          collection: 'notifications',
          documents,
        }),
      ).rejects.toThrow('Connection timeout');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Error handling should be fast
    });
  });

  describe('Memory Usage Performance', () => {
    it('should handle large datasets without excessive memory usage', async () => {
      const documents = Array.from({ length: 10000 }, (_, i) => ({
        _id: `doc_${i}`,
        userId: `user_${i}`,
        type: 'test',
        title: `Test Notification ${i}`,
        body: `Test body ${i}`,
        data: { largeField: 'x'.repeat(1000) }, // 1KB per document
        createdAt: new Date(),
      }));

      mockCollection.insertMany.mockResolvedValue({
        insertedCount: 10000,
        insertedIds: {},
      });

      const initialMemory = process.memoryUsage().heapUsed;
      const result = await service.executeBulkOperation({
        operation: 'insert',
        collection: 'notifications',
        documents,
      });
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result.successful).toBe(10000);
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });
  });
});
