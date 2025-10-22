import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbTestParticipantRepository } from './ab-test.repository';
import { AbTestParticipant } from '../domain/ab-test-participant.entity';
import { AbTestParticipantDocument } from '../ab-test-participant.schema';

@Injectable()
export class AbTestParticipantRepositoryImpl implements AbTestParticipantRepository {
  constructor(
    @InjectModel('AbTestParticipant')
    private readonly participantModel: Model<AbTestParticipantDocument>,
  ) {}

  async save(participant: AbTestParticipant): Promise<AbTestParticipant> {
    const data = participant.toPersistence();
    const saved = await this.participantModel.create(data);
    return AbTestParticipant.fromPersistence(saved.toObject());
  }

  async findByTestAndUser(testId: string, userId: string): Promise<AbTestParticipant | null> {
    const document = await this.participantModel.findOne({ testId, userId }).exec();
    if (!document) return null;
    return AbTestParticipant.fromPersistence(document.toObject());
  }

  async findByTestId(testId: string): Promise<AbTestParticipant[]> {
    const documents = await this.participantModel.find({ testId }).exec();
    return documents.map((doc) => AbTestParticipant.fromPersistence(doc.toObject()));
  }

  async findByUserId(userId: string): Promise<AbTestParticipant[]> {
    const documents = await this.participantModel.find({ userId }).exec();
    return documents.map((doc) => AbTestParticipant.fromPersistence(doc.toObject()));
  }

  async deleteByTestId(testId: string): Promise<void> {
    await this.participantModel.deleteMany({ testId }).exec();
  }
}
