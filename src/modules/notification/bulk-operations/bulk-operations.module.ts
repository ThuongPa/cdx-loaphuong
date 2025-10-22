import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BulkOperationsService } from './application/services/bulk-operations.service';
import { BulkOperationsRepository } from './infrastructure/bulk-operations.repository';
import { BulkOperationsRepositoryImpl } from './infrastructure/bulk-operations.repository.impl';
import { BulkOperation, BulkOperationSchema } from './bulk-operation.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: BulkOperation.name, schema: BulkOperationSchema }])],
  providers: [
    BulkOperationsService,
    {
      provide: 'BulkOperationsRepository',
      useClass: BulkOperationsRepositoryImpl,
    },
  ],
  exports: [BulkOperationsService],
})
export class BulkOperationsModule {}
