import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  message?: string;
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

export const StatisticsRateLimit = () =>
  RateLimit({
    limit: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many statistics requests',
  });

export const BroadcastRateLimit = () =>
  RateLimit({
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many broadcast requests',
  });

export const AdminRateLimit = () =>
  RateLimit({
    limit: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many admin requests',
  });
