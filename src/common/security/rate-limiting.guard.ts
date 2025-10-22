import { Request, Response } from 'express';
import { RateLimitingService } from './rate-limiting.service';
import { Injectable, ExecutionContext, CanActivate, HttpException, HttpStatus, Res } from '@nestjs/common';

@Injectable()
export class RateLimitingGuard implements CanActivate {
  constructor(private readonly rateLimitingService: RateLimitingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      const ip = this.getClientIP(request);
      const userId = (request as any).user?.id;
      const isAdmin = (request as any).user?.role === 'admin';
      const endpoint = request.route?.path || request.path;

      // Check IP rate limit
      const ipRateLimit = await this.rateLimitingService.checkIPRateLimit(ip);
      if (!ipRateLimit.allowed) {
        this.setRateLimitHeaders(response, ipRateLimit);
        throw new HttpException(
          {
            error: 'Too Many Requests',
            message: 'IP rate limit exceeded',
            retryAfter: Math.ceil((ipRateLimit.resetTime - Date.now()) / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Check user rate limit if authenticated
      if (userId) {
        const userRateLimit = await this.rateLimitingService.checkUserRateLimit(userId, isAdmin);
        if (!userRateLimit.allowed) {
          this.setRateLimitHeaders(response, userRateLimit);
          throw new HttpException(
            {
              error: 'Too Many Requests',
              message: 'User rate limit exceeded',
              retryAfter: Math.ceil((userRateLimit.resetTime - Date.now()) / 1000),
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // Check endpoint-specific rate limit
      const endpointRateLimit = await this.rateLimitingService.checkEndpointRateLimit(
        endpoint,
        userId,
      );
      if (!endpointRateLimit.allowed) {
        this.setRateLimitHeaders(response, endpointRateLimit);
        throw new HttpException(
          {
            error: 'Too Many Requests',
            message: 'Endpoint rate limit exceeded',
            retryAfter: Math.ceil((endpointRateLimit.resetTime - Date.now()) / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Set rate limit headers
      this.setRateLimitHeaders(response, endpointRateLimit);

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // If rate limiting service fails, allow the request (fail open)
      return true;
    }
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  private setRateLimitHeaders(response: Response, rateLimit: any): void {
    response.setHeader('X-RateLimit-Limit', rateLimit.maxRequests || 1000);
    response.setHeader('X-RateLimit-Remaining', rateLimit.remaining || 0);
    response.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
    response.setHeader('X-RateLimit-TotalHits', rateLimit.totalHits || 0);
  }
}
