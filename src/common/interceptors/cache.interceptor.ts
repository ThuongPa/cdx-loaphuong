import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly ttl: number = 300, // 5 minutes default
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);

    try {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        return of(JSON.parse(cachedData));
      }
    } catch (error) {
      // Continue to next handler if cache fails
    }

    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.redisService.set(cacheKey, JSON.stringify(data), this.ttl);
        } catch (error) {
          // Log error but don't fail the request
        }
      }),
    );
  }

  private generateCacheKey(request: unknown): string {
    const { method, url, query, body } = request as any;
    const userId = (request as any).user?.id || 'anonymous';
    return `cache:${method}:${url}:${userId}:${JSON.stringify({ query, body })}`;
  }
}
