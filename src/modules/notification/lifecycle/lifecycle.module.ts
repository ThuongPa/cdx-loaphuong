import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LifecycleStageService } from './application/services/lifecycle-stage.service';
import { LifecycleStageRepositoryImpl } from './infrastructure/lifecycle-stage.repository.impl';
import { LifecycleStage, LifecycleStageSchema } from './lifecycle-stage.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'LifecycleStage', schema: LifecycleStageSchema }])],
  providers: [
    LifecycleStageService,
    {
      provide: 'LifecycleStageRepository',
      useClass: LifecycleStageRepositoryImpl,
    },
  ],
  exports: [LifecycleStageService],
})
export class LifecycleModule {}
