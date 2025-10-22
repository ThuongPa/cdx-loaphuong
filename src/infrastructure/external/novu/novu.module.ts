import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { AuthServiceModule } from '../auth-service/auth-service.module';
import { NovuClient } from './novu.client';
import { NovuSubscriberService } from './novu-subscriber.service';
import { NovuWorkflowService } from './novu-workflow.service';
import { NovuRetryService } from './novu-retry.service';

@Module({
  imports: [ConfigModule, CircuitBreakerModule, AuthServiceModule],
  providers: [NovuClient, NovuSubscriberService, NovuWorkflowService, NovuRetryService],
  exports: [NovuClient, NovuSubscriberService, NovuWorkflowService, NovuRetryService],
})
export class NovuModule {}
