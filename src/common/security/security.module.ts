import { Module, Global } from '@nestjs/common';
import { RateLimitingService } from './rate-limiting.service';
import { RateLimitingGuard } from './rate-limiting.guard';
import { SecurityHeadersService } from './security-headers.service';
import { SecurityHeadersInterceptor } from './security-headers.interceptor';
import { RedisModule } from '../../infrastructure/cache/redis.module';
import { LoggingModule } from '../../infrastructure/logging/logging.module';

@Global()
@Module({
  imports: [RedisModule, LoggingModule],
  providers: [
    RateLimitingService,
    RateLimitingGuard,
    SecurityHeadersService,
    SecurityHeadersInterceptor,
  ],
  exports: [
    RateLimitingService,
    RateLimitingGuard,
    SecurityHeadersService,
    SecurityHeadersInterceptor,
  ],
})
export class SecurityModule {}
