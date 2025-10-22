import { Module, Global, Logger } from '@nestjs/common';
import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { StructuredLoggerService } from '../../modules/notification/shared/services/structured-logger.service';

@Global()
@Module({
  providers: [StructuredLoggerService, RequestLoggingInterceptor],
  exports: [StructuredLoggerService, RequestLoggingInterceptor],
})
export class LoggingModule {}
