import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import { NovuModule } from '../../../infrastructure/external/novu/novu.module';
import { DeviceTokenController } from './interface/device-token.controller';
import { DeviceTokenService } from './application/services/device-token.service';
import { NovuSubscriberSyncService } from './application/services/novu-subscriber-sync.service';
import { DeviceTokenRepositoryImpl } from './infrastructure/device-token.repository.impl';
import {
  DeviceToken,
  DeviceTokenSchema,
} from '../../../infrastructure/database/schemas/device-token.schema';

// Command Handlers
import { RegisterTokenHandler } from './application/commands/register-token.handler';
import { UpdateTokenHandler } from './application/commands/update-token.handler';
import { DeleteTokenHandler } from './application/commands/delete-token.handler';

// Query Handlers
import { GetUserTokensHandler } from './application/queries/get-user-tokens.handler';

@Module({
  imports: [
    CqrsModule,
    NovuModule,
    MongooseModule.forFeature([{ name: DeviceToken.name, schema: DeviceTokenSchema }]),
  ],
  controllers: [DeviceTokenController],
  providers: [
    DeviceTokenService,
    NovuSubscriberSyncService,
    {
      provide: 'DeviceTokenRepository',
      useClass: DeviceTokenRepositoryImpl,
    },
    DeviceTokenRepositoryImpl,

    // Command Handlers
    RegisterTokenHandler,
    UpdateTokenHandler,
    DeleteTokenHandler,

    // Query Handlers
    GetUserTokensHandler,
  ],
  exports: [DeviceTokenService, 'DeviceTokenRepository', DeviceTokenRepositoryImpl],
})
export class DeviceTokenModule {}
