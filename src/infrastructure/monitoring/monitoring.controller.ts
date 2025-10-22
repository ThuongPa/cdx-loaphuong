import { Response } from 'express';
import { PrometheusService } from './prometheus.service';
import { HealthCheckService } from './health-check.service';
import { HttpStatus, Controller, Get, Res } from '@nestjs/common';
import { Type } from 'class-transformer';

@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  @Get('metrics')
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.prometheusService.getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.status(HttpStatus.OK).send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to retrieve metrics',
        message: error.message,
      });
    }
  }

  @Get('health')
  async getHealth(@Res() res: Response): Promise<void> {
    try {
      const health = await this.healthCheckService.performHealthCheck();
      const statusCode =
        health.status === 'healthy'
          ? HttpStatus.OK
          : health.status === 'degraded'
            ? HttpStatus.OK
            : HttpStatus.SERVICE_UNAVAILABLE;

      res.status(statusCode).json(health);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error.message,
      });
    }
  }

  @Get('health/live')
  async getLiveness(@Res() res: Response): Promise<void> {
    try {
      const liveness = await this.healthCheckService.livenessCheck();
      res.status(HttpStatus.OK).json(liveness);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'dead',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('health/ready')
  async getReadiness(@Res() res: Response): Promise<void> {
    try {
      const readiness = await this.healthCheckService.readinessCheck();
      const statusCode = readiness.ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(readiness);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        ready: false,
        error: error.message,
      });
    }
  }

  @Get('metrics/json')
  async getMetricsAsJson(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.prometheusService.getMetricsAsJson();
      res.status(HttpStatus.OK).json(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to retrieve metrics',
        message: error.message,
      });
    }
  }
}
