import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSyncService } from './application/services/user-sync.service';
import { UserSyncRepository } from './infrastructure/user-sync.repository';
import { UserSyncRepositoryImpl } from './infrastructure/user-sync.repository.impl';
import { UserSync, UserSyncSchema } from './user-sync.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: UserSync.name, schema: UserSyncSchema }])],
  providers: [
    UserSyncService,
    {
      provide: 'UserSyncRepository',
      useClass: UserSyncRepositoryImpl,
    },
  ],
  exports: [UserSyncService],
})
export class UserSyncModule {}
