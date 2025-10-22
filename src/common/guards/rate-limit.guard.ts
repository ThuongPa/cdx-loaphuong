import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';
import { RedisService } from '../../infrastructure/cache/redis.service';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  limit: number; // Maximum number of requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get client identifier (IP address or user ID)
    const clientId = this.getClientIdentifier(request);
    const key = `rate_limit:${clientId}:${context.getClass().name}:${context.getHandler().name}`;

    try {
      const current = await this.redisService.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= rateLimitOptions.limit) {
        // Set rate limit headers
        response.setHeader('X-RateLimit-Limit', rateLimitOptions.limit);
        response.setHeader('X-RateLimit-Remaining', 0);
        response.setHeader(
          'X-RateLimit-Reset',
          new Date(Date.now() + rateLimitOptions.windowMs).toISOString(),
        );

        throw new HttpException(
          rateLimitOptions.message || 'Too many requests',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Increment counter
      if (count === 0) {
        await this.redisService.set(key, '1', Math.ceil(rateLimitOptions.windowMs / 1000));
      } else {
        await this.redisService.set(
          key,
          (count + 1).toString(),
          Math.ceil(rateLimitOptions.windowMs / 1000),
        );
      }

      // Set rate limit headers
      response.setHeader('X-RateLimit-Limit', rateLimitOptions.limit);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitOptions.limit - count - 1));
      response.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + rateLimitOptions.windowMs).toISOString(),
      );

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // If Redis is unavailable, allow the request but log the error
      console.error('Rate limiting error:', error);
      return true;
    }
  }

  private getClientIdentifier(request: unknown): string {
    // Try to get user ID first (if authenticated)
    if ((request as any).user && (request as any).user.id) {
      return `user:${(request as any).user.id}`;
    }

    // Fall back to IP address
    const forwarded = (request as any).headers?.['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : (request as any).connection?.remoteAddress;
    return `ip:${ip}`;
  }
}
