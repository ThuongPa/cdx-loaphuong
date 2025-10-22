import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonitoringMetric, MonitoringMetricSchema } from './advanced-monitoring.schema';
import { AdvancedMonitoringService } from './application/services/advanced-monitoring.service';
import { AdvancedMonitoringRepositoryImpl } from './infrastructure/advanced-monitoring.repository.impl';
import { AdvancedMonitoringRepository } from './infrastructure/advanced-monitoring.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MonitoringMetric.name, schema: MonitoringMetricSchema }]),
  ],
  providers: [
    AdvancedMonitoringService,
    {
      provide: 'AdvancedMonitoringRepository',
      useClass: AdvancedMonitoringRepositoryImpl,
    },
  ],
  exports: [AdvancedMonitoringService],
})
export class AdvancedMonitoringModule {}
