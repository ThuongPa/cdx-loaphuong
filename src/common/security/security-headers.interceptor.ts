import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Res } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';
import { SecurityHeadersService } from './security-headers.service';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  constructor(private readonly securityHeadersService: SecurityHeadersService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest();

    // Set security headers
    const securityHeaders = this.securityHeadersService.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.setHeader(key, value);
    });

    // Set CORS headers for API endpoints
    if (request.path.startsWith('/api/')) {
      const corsHeaders = this.securityHeadersService.getCORSHeaders();
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.setHeader(key, value);
      });
    }

    // Set cache control headers for sensitive endpoints
    if (this.isSensitiveEndpoint(request.path)) {
      const cacheHeaders = this.securityHeadersService.getCacheControlHeaders();
      Object.entries(cacheHeaders).forEach(([key, value]) => {
        response.setHeader(key, value);
      });
    }

    // Set API-specific headers
    if (request.path.startsWith('/api/')) {
      const apiHeaders = this.securityHeadersService.getAPIHeaders();
      Object.entries(apiHeaders).forEach(([key, value]) => {
        response.setHeader(key, value);
      });
    }

    return next.handle().pipe(
      tap(() => {
        // Additional response processing if needed
      }),
    );
  }

  private isSensitiveEndpoint(path: string): boolean {
    const sensitivePaths = [
      '/api/v1/auth',
      '/api/v1/admin',
      '/api/v1/notifications',
      '/monitoring',
    ];

    return sensitivePaths.some((sensitivePath) => path.startsWith(sensitivePath));
  }
}
