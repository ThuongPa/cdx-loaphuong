import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import {
  UserPreferences,
  UserPreferencesSchema,
} from '../../../infrastructure/database/schemas/user-preferences.schema';
import { UserPreferencesRepositoryImpl } from './infrastructure/user-preferences.repository.impl';
import { PreferencesCacheService } from './infrastructure/preferences-cache.service';
import { CachedUserPreferencesRepository } from './infrastructure/cached-user-preferences.repository';
import { GetPreferencesHandler } from './application/commands/get-preferences.handler';
import { UpdatePreferencesHandler } from './application/commands/update-preferences.handler';
import { PreferencesController } from './interface/preferences.controller';
import { RedisModule } from '../../../infrastructure/cache/redis.module';

@Module({
  imports: [
    CqrsModule,
    RedisModule,
    MongooseModule.forFeature([{ name: UserPreferences.name, schema: UserPreferencesSchema }]),
  ],
  controllers: [PreferencesController],
  providers: [
    // Repository
    {
      provide: 'UserPreferencesRepository',
      useClass: CachedUserPreferencesRepository,
    },
    UserPreferencesRepositoryImpl,
    PreferencesCacheService,
    CachedUserPreferencesRepository,

    // Command/Query Handlers
    GetPreferencesHandler,
    UpdatePreferencesHandler,
  ],
  exports: [
    'UserPreferencesRepository',
    UserPreferencesRepositoryImpl,
    PreferencesCacheService,
    CachedUserPreferencesRepository,
  ],
})
export class PreferencesModule {}
