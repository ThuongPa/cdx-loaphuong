import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AbTestService } from './application/services/ab-test.service';
import { AbTestRepositoryImpl } from './infrastructure/ab-test.repository.impl';
import { AbTestParticipantRepositoryImpl } from './infrastructure/ab-test-participant.repository.impl';
import { AbTest, AbTestSchema } from './ab-test.schema';
import { AbTestParticipant, AbTestParticipantSchema } from './ab-test-participant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AbTest', schema: AbTestSchema },
      { name: 'AbTestParticipant', schema: AbTestParticipantSchema },
    ]),
  ],
  providers: [
    AbTestService,
    {
      provide: 'AbTestRepository',
      useClass: AbTestRepositoryImpl,
    },
    {
      provide: 'AbTestParticipantRepository',
      useClass: AbTestParticipantRepositoryImpl,
    },
  ],
  exports: [AbTestService],
})
export class AbTestingModule {}
