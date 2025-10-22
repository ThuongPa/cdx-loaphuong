import { Response } from 'express';
import { PrometheusService } from './prometheus.service';
import { HttpStatus, Controller, Get, Res } from '@nestjs/common';
import { Type } from 'class-transformer';

@Controller()
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get('metrics')
  async rootMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.prometheusService.getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.status(HttpStatus.OK).send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to retrieve metrics',
        message: (error as Error).message,
      });
    }
  }
}
