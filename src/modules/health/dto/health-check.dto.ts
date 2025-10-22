import { IsString, IsBoolean, IsOptional, IsObject, IsNumber } from 'class-validator';

export class HealthCheckDto {
  @IsString()
  service: string;

  @IsBoolean()
  status: boolean;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsNumber()
  responseTime?: number;

  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}

export class HealthStatusDto {
  @IsString()
  status: 'healthy' | 'unhealthy' | 'degraded';

  @IsString()
  timestamp: string;

  @IsNumber()
  uptime: number;

  @IsString()
  version: string;

  @IsObject()
  services: Record<string, HealthCheckDto>;
}
