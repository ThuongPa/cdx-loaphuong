import { Module, Controller, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AbTest, AbTestSchema } from './ab-test.schema';
import { AbTestParticipant, AbTestParticipantSchema } from './ab-test-participant.schema';
import { AbTestRepository } from './ab-test.repository';
import { AbTestService } from './application/services/ab-test.service';
import { AbTestController } from './ab-test.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AbTest.name, schema: AbTestSchema },
      { name: AbTestParticipant.name, schema: AbTestParticipantSchema },
    ]),
  ],
  controllers: [AbTestController],
  providers: [AbTestRepository, AbTestService],
  exports: [AbTestService, AbTestRepository],
})
export class AbTestModule {}
