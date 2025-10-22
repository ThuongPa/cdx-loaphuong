import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PrometheusService } from '../monitoring/prometheus.service';
import { Injectable, Get, Delete, Query, Res, Logger } from '@nestjs/common';
import { StructuredLoggerService } from '../../modules/notification/shared/services/structured-logger.service';

export interface BulkOperation {
  operation: 'insert' | 'update' | 'delete' | 'upsert';
  collection: string;
  documents: any[];
  filter?: any;
  update?: any;
  options?: any;
}

export interface BulkOperationResult {
  operation: string;
  collection: string;
  processed: number;
  successful: number;
  failed: number;
  duration: number;
  errors?: string[];
}

@Injectable()
export class MongoDBBulkService {
  private readonly logger = new Logger(MongoDBBulkService.name);
  private readonly batchSize = parseInt(process.env.MONGODB_BATCH_SIZE || '1000');

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly prometheusService: PrometheusService,
    private readonly structuredLogger: StructuredLoggerService,
  ) {}

  async executeBulkOperation(operation: BulkOperation): Promise<BulkOperationResult> {
    const startTime = Date.now();
    const result: BulkOperationResult = {
      operation: operation.operation,
      collection: operation.collection,
      processed: 0,
      successful: 0,
      failed: 0,
      duration: 0,
      errors: [],
    };

    try {
      const collection = this.connection.collection(operation.collection);

      switch (operation.operation) {
        case 'insert':
          result.processed = operation.documents.length;
          const insertResult = await this.bulkInsert(collection, operation.documents);
          result.successful = insertResult.insertedCount;
          result.failed = result.processed - result.successful;
          break;

        case 'update':
          result.processed = operation.documents.length;
          const updateResult = await this.bulkUpdate(
            collection,
            operation.documents,
            operation.filter,
            operation.update,
            operation.options,
          );
          result.successful = updateResult.modifiedCount;
          result.failed = result.processed - result.successful;
          break;

        case 'delete':
          result.processed = operation.documents.length;
          const deleteResult = await this.bulkDelete(
            collection,
            operation.documents,
            operation.filter,
          );
          result.successful = deleteResult.deletedCount;
          result.failed = result.processed - result.successful;
          break;

        case 'upsert':
          result.processed = operation.documents.length;
          const upsertResult = await this.bulkUpsert(
            collection,
            operation.documents,
            operation.filter,
            operation.update,
            operation.options,
          );
          result.successful = upsertResult.upsertedCount + upsertResult.modifiedCount;
          result.failed = result.processed - result.successful;
          break;

        default:
          throw new Error(`Unsupported bulk operation: ${operation.operation}`);
      }

      result.duration = Date.now() - startTime;

      // Update metrics
      this.prometheusService.recordDatabaseQueryDuration(
        `bulk_${operation.operation}`,
        operation.collection,
        result.duration / 1000,
      );

      // Log operation
      this.structuredLogger.log(`bulk_${operation.operation}`, {
        collection: operation.collection,
        duration: result.duration,
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
      });

      this.logger.log(`Bulk ${operation.operation} completed`, {
        collection: operation.collection,
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.failed = result.processed;
      result.errors = [error.message];

      this.logger.error(`Bulk ${operation.operation} failed`, {
        collection: operation.collection,
        error: error.message,
        duration: result.duration,
      });

      throw error;
    }
  }

  private async bulkInsert(collection: any, documents: any[]): Promise<any> {
    const chunks = this.chunkArray(documents, this.batchSize);
    let totalInserted = 0;

    for (const chunk of chunks) {
      try {
        const result = await collection.insertMany(chunk, { ordered: false });
        totalInserted += result.insertedCount;
      } catch (error) {
        // Handle partial failures
        if (error.writeErrors) {
          totalInserted += error.result?.insertedCount || 0;
        }
        throw error;
      }
    }

    return { insertedCount: totalInserted };
  }

  private async bulkUpdate(
    collection: any,
    documents: any[],
    filter: any,
    update: any,
    options: any = {},
  ): Promise<any> {
    const chunks = this.chunkArray(documents, this.batchSize);
    let totalModified = 0;

    for (const chunk of chunks) {
      const bulkOps = chunk.map((doc) => ({
        updateOne: {
          filter: filter ? { ...filter, _id: doc._id } : { _id: doc._id },
          update: update || { $set: doc },
          upsert: options.upsert || false,
        },
      }));

      const result = await collection.bulkWrite(bulkOps, { ordered: false });
      totalModified += result.modifiedCount;
    }

    return { modifiedCount: totalModified };
  }

  private async bulkDelete(collection: any, documents: any[], filter: any): Promise<any> {
    const chunks = this.chunkArray(documents, this.batchSize);
    let totalDeleted = 0;

    for (const chunk of chunks) {
      const bulkOps = chunk.map((doc) => ({
        deleteOne: {
          filter: filter ? { ...filter, _id: doc._id } : { _id: doc._id },
        },
      }));

      const result = await collection.bulkWrite(bulkOps, { ordered: false });
      totalDeleted += result.deletedCount;
    }

    return { deletedCount: totalDeleted };
  }

  private async bulkUpsert(
    collection: any,
    documents: any[],
    filter: any,
    update: any,
    options: any = {},
  ): Promise<any> {
    const chunks = this.chunkArray(documents, this.batchSize);
    let totalUpserted = 0;
    let totalModified = 0;

    for (const chunk of chunks) {
      const bulkOps = chunk.map((doc) => ({
        updateOne: {
          filter: filter ? { ...filter, _id: doc._id } : { _id: doc._id },
          update: update || { $set: doc },
          upsert: true,
        },
      }));

      const result = await collection.bulkWrite(bulkOps, { ordered: false });
      totalUpserted += result.upsertedCount;
      totalModified += result.modifiedCount;
    }

    return { upsertedCount: totalUpserted, modifiedCount: totalModified };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async optimizeCollection(collectionName: string): Promise<{
    indexes: string[];
    stats: any;
    optimized: boolean;
  }> {
    try {
      const collection = this.connection.collection(collectionName);

      // Get current indexes
      const indexes = await collection.indexes();
      const indexNames = indexes.map((index) => index.name);

      // Get collection stats
      const stats = await (collection as any).stats();

      // Create common indexes if they don't exist
      const commonIndexes = [
        { key: { createdAt: 1 }, name: 'createdAt_1' },
        { key: { updatedAt: 1 }, name: 'updatedAt_1' },
        { key: { userId: 1 }, name: 'userId_1' },
        { key: { status: 1 }, name: 'status_1' },
      ];

      for (const index of commonIndexes) {
        if (!indexNames.includes(index.name)) {
          try {
            await collection.createIndex(index.key as any, { name: index.name });
            this.logger.log(`Created index ${index.name} on collection ${collectionName}`);
          } catch (error) {
            this.logger.warn(`Failed to create index ${index.name}: ${error.message}`);
          }
        }
      }

      return {
        indexes: indexNames.filter((name) => name !== undefined) as string[],
        stats,
        optimized: true,
      };
    } catch (error) {
      this.logger.error(`Failed to optimize collection ${collectionName}:`, error);
      return {
        indexes: [],
        stats: null,
        optimized: false,
      };
    }
  }

  async getCollectionStats(collectionName: string): Promise<any> {
    try {
      const collection = this.connection.collection(collectionName);
      const stats = await (collection as any).stats();

      return {
        name: collectionName,
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        totalIndexSize: stats.totalIndexSize,
        indexSizes: stats.indexSizes,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for collection ${collectionName}:`, error);
      return null;
    }
  }

  async getAllCollectionsStats(): Promise<any[]> {
    try {
      const collections = (await this.connection.db?.listCollections().toArray()) || [];
      const stats = [];

      for (const collection of collections) {
        const collectionStats = await this.getCollectionStats(collection.name);
        if (collectionStats) {
          stats.push(collectionStats);
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get all collections stats:', error);
      return [];
    }
  }
}
