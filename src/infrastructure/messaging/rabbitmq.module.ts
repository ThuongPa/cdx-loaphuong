import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQConsumerService } from './rabbitmq-consumer.service';
import { EventValidationService } from './event-validation.service';
import { RabbitMQRetryService } from './rabbitmq-retry.service';

@Module({
  imports: [ConfigModule],
  providers: [
    RabbitMQService,
    RabbitMQConsumerService,
    EventValidationService,
    RabbitMQRetryService,
  ],
  exports: [RabbitMQService, RabbitMQConsumerService, EventValidationService, RabbitMQRetryService],
})
export class RabbitMQModule {}
