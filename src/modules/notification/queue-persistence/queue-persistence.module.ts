import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueuePersistenceService } from './application/services/queue-persistence.service';
import { QueuePersistenceRepository } from './infrastructure/queue-persistence.repository';
import { QueuePersistenceRepositoryImpl } from './infrastructure/queue-persistence.repository.impl';
import { QueueOperation, QueueOperationSchema } from './queue-persistence.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: QueueOperation.name, schema: QueueOperationSchema }]),
  ],
  providers: [
    QueuePersistenceService,
    {
      provide: 'QueuePersistenceRepository',
      useClass: QueuePersistenceRepositoryImpl,
    },
  ],
  exports: [QueuePersistenceService],
})
export class QueuePersistenceModule {}
