import { Module, Controller } from '@nestjs/common';
import { BatchProcessingController } from './batch-processing.controller';
import { BatchProcessingService } from './batch-processing.service';
import { RabbitMQModule } from '../../../infrastructure/messaging/rabbitmq.module';
import { RedisModule } from '../../../infrastructure/cache/redis.module';
import { MonitoringModule } from '../../../infrastructure/monitoring/monitoring.module';
import { LoggingModule } from '../../../infrastructure/logging/logging.module';

@Module({
  imports: [RabbitMQModule, RedisModule, MonitoringModule, LoggingModule],
  controllers: [BatchProcessingController],
  providers: [BatchProcessingService],
  exports: [BatchProcessingService],
})
export class BatchProcessingModule {}
