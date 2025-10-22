import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  Injectable,
  ExecutionContext,
  NestInterceptor,
  CallHandler,
  Res,
  Logger,
} from '@nestjs/common';
import { StructuredLoggerService } from '../../modules/notification/shared/services/structured-logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private readonly structuredLogger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const requestId = uuidv4();
    const correlationId = (request.headers['x-correlation-id'] as string) || uuidv4();

    // Add request ID to response headers
    response.setHeader('x-request-id', requestId);
    response.setHeader('x-correlation-id', correlationId);

    // Extract request information
    const requestInfo = {
      requestId,
      correlationId,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection.remoteAddress,
      userId: (request as any).user?.id,
    };

    // Log request start
    this.structuredLogger.log('Request started', {
      ...requestInfo,
    });

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful request
        this.structuredLogger.log('Request completed', {
          method: request.method,
          url: request.url,
          statusCode,
          responseTime,
        });

        this.logger.debug(
          `Request completed: ${request.method} ${request.url} - ${statusCode} - ${responseTime}ms`,
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log failed request
        this.structuredLogger.log('Request failed', {
          ...requestInfo,
          method: request.method,
          url: request.url,
          statusCode,
          responseTime,
          error: error.message,
          stack: error.stack,
        });

        this.logger.error(
          `Request failed: ${request.method} ${request.url} - ${statusCode} - ${responseTime}ms`,
          error.stack,
        );

        throw error;
      }),
    );
  }
}
