import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SegmentService } from './application/services/segment.service';
import { SegmentRepositoryImpl } from './infrastructure/segment.repository.impl';
import { Segment, SegmentSchema } from './segment.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Segment', schema: SegmentSchema }])],
  providers: [
    SegmentService,
    {
      provide: 'SegmentRepository',
      useClass: SegmentRepositoryImpl,
    },
  ],
  exports: [SegmentService],
})
export class SegmentationModule {}
