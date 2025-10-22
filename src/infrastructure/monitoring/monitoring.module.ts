import { Module, Controller } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitoringController } from './monitoring.controller';
import { MetricsController } from './metrics.controller';
import { PrometheusService } from './prometheus.service';
import { HealthCheckService } from './health-check.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { RedisModule } from '../cache/redis.module';
import { RabbitMQModule } from '../messaging/rabbitmq.module';
// import { NovuModule } from '../notification/novu.module';

@Module({
  imports: [MongooseModule, RedisModule, RabbitMQModule],
  controllers: [MonitoringController, MetricsController],
  providers: [PrometheusService, HealthCheckService, MetricsInterceptor],
  exports: [PrometheusService, HealthCheckService, MetricsInterceptor],
})
export class MonitoringModule {}
