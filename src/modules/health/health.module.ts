import { Module, Controller } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../../infrastructure/cache/redis.module';
import { RabbitMQModule } from '../../infrastructure/messaging/rabbitmq.module';
import { NovuModule } from '../../infrastructure/external/novu/novu.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [TerminusModule, MongooseModule, RedisModule, RabbitMQModule, NovuModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
