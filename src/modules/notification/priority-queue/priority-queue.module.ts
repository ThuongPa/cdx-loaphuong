import { Module, Controller } from '@nestjs/common';
import { PriorityQueueController } from './priority-queue.controller';
import { PriorityQueueService } from './priority-queue.service';
import { RabbitMQModule } from '../../../infrastructure/messaging/rabbitmq.module';
import { RedisModule } from '../../../infrastructure/cache/redis.module';
import { MonitoringModule } from '../../../infrastructure/monitoring/monitoring.module';
import { LoggingModule } from '../../../infrastructure/logging/logging.module';
import { NovuModule } from '../../../infrastructure/external/novu/novu.module';

@Module({
  imports: [RabbitMQModule, RedisModule, MonitoringModule, LoggingModule, NovuModule],
  controllers: [PriorityQueueController],
  providers: [PriorityQueueService],
  exports: [PriorityQueueService],
})
export class PriorityQueueModule {}
