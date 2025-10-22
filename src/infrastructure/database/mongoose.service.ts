import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class MongooseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongooseService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    this.logger.log('MongoDB connection established');

    // Set up connection event listeners
    this.connection.on('_', () => {
      this.logger.log('_ _');
    });

    this.connection.on('_', (_) => {
      this.logger.error('_ _ _:', _);
    });

    this.connection.on('_', () => {
      this.logger.warn('_ _');
    });

    // Create indexes
    await this.createIndexes();
  }

  async onModuleDestroy() {
    await this.connection.close();
    this.logger.log('MongoDB connection closed');
  }

  private async createIndexes() {
    try {
      // This will be implemented when we have the actual schemas registered
      this.logger.log('Database indexes will be created when schemas are registered');
    } catch (error) {
      this.logger.error('Error creating database indexes:', error);
    }
  }

  getConnection(): Connection {
    return this.connection;
  }
}
