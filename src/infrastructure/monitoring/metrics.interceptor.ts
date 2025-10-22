import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { PrometheusService } from './prometheus.service';
import {
  Injectable,
  ExecutionContext,
  NestInterceptor,
  CallHandler,
  Get,
  Res,
  Logger,
} from '@nestjs/common';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(private readonly prometheusService: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const method = request.method;
    const route = this.getRoute(request);
    const startTime = Date.now();

    // Increment in-progress requests
    this.prometheusService.incrementHttpRequestInProgress(method, route);

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = response.statusCode;

        // Record successful request
        this.prometheusService.recordHttpRequest(method, route, statusCode, duration);
        this.prometheusService.decrementHttpRequestInProgress(method, route);

        this.logger.debug(`Request completed: ${method} ${route} - ${statusCode} - ${duration}s`);
      }),
      catchError((error) => {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = error.status || 500;

        // Record failed request
        this.prometheusService.recordHttpRequest(method, route, statusCode, duration);
        this.prometheusService.decrementHttpRequestInProgress(method, route);

        this.logger.error(
          `Request failed: ${method} ${route} - ${statusCode} - ${duration}s`,
          error.stack,
        );

        throw error;
      }),
    );
  }

  private getRoute(request: Request): string {
    // Get the route pattern instead of the actual URL
    const route = request.route?.path || request.path;

    // Normalize route patterns
    return route
      .replace(/\/:[^/]+/g, '/:param') // Replace path parameters
      .replace(/\/\d+/g, '/:id') // Replace numeric IDs
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs
      .replace(/\/[a-f0-9]{24}/g, '/:objectId'); // Replace MongoDB ObjectIds
  }
}
