import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  Injectable,
  ExecutionContext,
  NestInterceptor,
  CallHandler,
  Res,
  Logger,
} from '@nestjs/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const userId = request.user?.id || 'anonymous';

    const now = Date.now();
    this.logger.log(
      `Incoming request: ${method} ${url} from ${ip} (${userAgent}) by user ${userId}`,
    );

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const contentLength = response.get('content-length');
        const responseTime = Date.now() - now;

        this.logger.log(
          `Outgoing response: ${method} ${url} ${statusCode} ${contentLength || 0}b ${responseTime}ms`,
        );
      }),
    );
  }
}
