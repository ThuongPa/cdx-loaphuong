import { Module, Controller } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoDBBulkService } from './mongodb-bulk.service';
import { RedisOptimizationService } from './redis-optimization.service';
import { ConnectionPoolService } from './connection-pool.service';
import { HorizontalScalingService } from './horizontal-scaling.service';
import { PerformanceController } from './performance.controller';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { RedisModule } from '../cache/redis.module';
import { LoggingModule } from '../logging/logging.module';


@Module({
  imports: [
    MongooseModule.forFeature([]), // Add any required schemas here
    MonitoringModule,
    RedisModule,
    LoggingModule,
  ],
  providers: [
    MongoDBBulkService,
    RedisOptimizationService,
    ConnectionPoolService,
    HorizontalScalingService,
  ],
  controllers: [PerformanceController],
  exports: [
    MongoDBBulkService,
    RedisOptimizationService,
    ConnectionPoolService,
    HorizontalScalingService,
  ],
})
export class PerformanceModule {}
