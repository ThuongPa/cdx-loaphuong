import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottleRuleService } from './application/services/throttle-rule.service';
import { ThrottleRuleRepositoryImpl } from './infrastructure/throttle-rule.repository.impl';
import { ThrottleRule, ThrottleRuleSchema } from './throttle-rule.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'ThrottleRule', schema: ThrottleRuleSchema }])],
  providers: [
    ThrottleRuleService,
    {
      provide: 'ThrottleRuleRepository',
      useClass: ThrottleRuleRepositoryImpl,
    },
  ],
  exports: [ThrottleRuleService],
})
export class ThrottlingModule {}
