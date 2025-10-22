import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './application/services/analytics.service';
import { AnalyticsRepositoryImpl } from './infrastructure/analytics.repository.impl';
import { AnalyticsMetric, AnalyticsMetricSchema } from './analytics-metric.schema';
import { AnalyticsReport, AnalyticsReportSchema } from './analytics-report.schema';
import { AnalyticsDashboard, AnalyticsDashboardSchema } from './analytics-dashboard.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AnalyticsMetric', schema: AnalyticsMetricSchema },
      { name: 'AnalyticsReport', schema: AnalyticsReportSchema },
      { name: 'AnalyticsDashboard', schema: AnalyticsDashboardSchema },
    ]),
  ],
  providers: [
    AnalyticsService,
    {
      provide: 'AnalyticsRepository',
      useClass: AnalyticsRepositoryImpl,
    },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
