import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { AuthServiceClient } from './auth-service.client';

@Module({
  imports: [
    ConfigModule,
    CircuitBreakerModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [AuthServiceClient],
  exports: [AuthServiceClient],
})
export class AuthServiceModule {}
