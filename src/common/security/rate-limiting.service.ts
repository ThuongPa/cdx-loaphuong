import { RedisService } from '../../infrastructure/cache/redis.service';
import { Injectable, Get, Res, Logger } from '@nestjs/common';
import { StructuredLoggerService } from '../../modules/notification/shared/services/structured-logger.service';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  constructor(
    private readonly redisService: RedisService,
    private readonly structuredLogger: StructuredLoggerService,
  ) {}

  async checkRateLimit(
    key: string,
    config: Partial<RateLimitConfig> = {},
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const windowKey = `rate_limit:${key}:${Math.floor(Date.now() / finalConfig.windowMs)}`;

    try {
      // Get current count
      const currentCount = (await this.redisService.get(windowKey)) || '0';
      const count = parseInt(currentCount);

      // Check if limit exceeded
      const allowed = count < finalConfig.maxRequests;

      if (allowed) {
        // Increment counter
        await this.redisService.incr(windowKey);
        await this.redisService.expire(windowKey, Math.ceil(finalConfig.windowMs / 1000));
      }

      const remaining = Math.max(0, finalConfig.maxRequests - count - (allowed ? 1 : 0));
      const resetTime = Math.ceil(Date.now() / finalConfig.windowMs) * finalConfig.windowMs;

      const result: RateLimitResult = {
        allowed,
        remaining,
        resetTime,
        totalHits: count + (allowed ? 1 : 0),
      };

      // Log rate limit check
      if (!allowed) {
        this.structuredLogger.log('Rate limit exceeded', {
          metadata: {
            key,
            count,
            maxRequests: finalConfig.maxRequests,
            windowMs: finalConfig.windowMs,
          },
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Rate limit check failed for key ${key}:`, error);

      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: finalConfig.maxRequests,
        resetTime: Date.now() + finalConfig.windowMs,
        totalHits: 0,
      };
    }
  }

  async checkUserRateLimit(userId: string, isAdmin: boolean = false): Promise<RateLimitResult> {
    const config = isAdmin
      ? { maxRequests: 100, windowMs: 60000 } // 100 requests per minute for admin
      : { maxRequests: 1000, windowMs: 60000 }; // 1000 requests per minute for users

    return this.checkRateLimit(`user:${userId}`, config);
  }

  async checkIPRateLimit(ip: string): Promise<RateLimitResult> {
    return this.checkRateLimit(`ip:${ip}`, {
      maxRequests: 2000, // 2000 requests per minute per IP
      windowMs: 60000,
    });
  }

  async checkEndpointRateLimit(endpoint: string, userId?: string): Promise<RateLimitResult> {
    const key = userId ? `endpoint:${endpoint}:user:${userId}` : `endpoint:${endpoint}`;

    // Different limits for different endpoints
    let maxRequests = 100;
    if (endpoint.includes('notification')) {
      maxRequests = 50; // Lower limit for notification endpoints
    } else if (endpoint.includes('admin')) {
      maxRequests = 20; // Even lower for admin endpoints
    }

    return this.checkRateLimit(key, {
      maxRequests,
      windowMs: 60000,
    });
  }

  async resetRateLimit(key: string): Promise<void> {
    try {
      const pattern = `rate_limit:${key}:*`;
      const keys = await this.redisService.keys(pattern);

      if (keys.length > 0) {
        await this.redisService.del(keys.join(' '));
        this.logger.log(`Rate limit reset for key: ${key}`);
      }
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for key ${key}:`, error);
    }
  }

  async getRateLimitStatus(key: string): Promise<{
    currentCount: number;
    maxRequests: number;
    windowMs: number;
    resetTime: number;
  }> {
    try {
      const windowKey = `rate_limit:${key}:${Math.floor(Date.now() / this.defaultConfig.windowMs)}`;
      const currentCount = (await this.redisService.get(windowKey)) || '0';
      const resetTime =
        Math.ceil(Date.now() / this.defaultConfig.windowMs) * this.defaultConfig.windowMs;

      return {
        currentCount: parseInt(currentCount),
        maxRequests: this.defaultConfig.maxRequests,
        windowMs: this.defaultConfig.windowMs,
        resetTime,
      };
    } catch (error) {
      this.logger.error(`Failed to get rate limit status for key ${key}:`, error);
      return {
        currentCount: 0,
        maxRequests: this.defaultConfig.maxRequests,
        windowMs: this.defaultConfig.windowMs,
        resetTime: Date.now() + this.defaultConfig.windowMs,
      };
    }
  }
}
