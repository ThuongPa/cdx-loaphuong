import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MultiProvider, MultiProviderSchema } from './multi-provider.schema';
import { MultiProviderService } from './application/services/multi-provider.service';
import { MultiProviderRepositoryImpl } from './infrastructure/multi-provider.repository.impl';
import { MultiProviderRepository } from './infrastructure/multi-provider.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: MultiProvider.name, schema: MultiProviderSchema }])],
  providers: [
    MultiProviderService,
    {
      provide: 'MultiProviderRepository',
      useClass: MultiProviderRepositoryImpl,
    },
  ],
  exports: [MultiProviderService],
})
export class MultiProviderModule {}
