import { Module, Controller } from '@nestjs/common';
import { QueueMonitoringController } from './queue-monitoring.controller';
import { QueueMonitoringService } from './queue-monitoring.service';
import { RabbitMQModule } from '../../../infrastructure/messaging/rabbitmq.module';
import { RedisModule } from '../../../infrastructure/cache/redis.module';
import { MonitoringModule } from '../../../infrastructure/monitoring/monitoring.module';

@Module({
  imports: [RabbitMQModule, RedisModule, MonitoringModule],
  controllers: [QueueMonitoringController],
  providers: [QueueMonitoringService],
  exports: [QueueMonitoringService],
})
export class QueueMonitoringModule {}
