import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FallbackStrategyService } from './application/services/fallback-strategy.service';
import { FallbackStrategyRepositoryImpl } from './infrastructure/fallback-strategy.repository.impl';
import { FallbackStrategy, FallbackStrategySchema } from './fallback-strategy.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'FallbackStrategy', schema: FallbackStrategySchema }]),
  ],
  providers: [
    FallbackStrategyService,
    {
      provide: 'FallbackStrategyRepository',
      useClass: FallbackStrategyRepositoryImpl,
    },
  ],
  exports: [FallbackStrategyService],
})
export class FallbackModule {}
