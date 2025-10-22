import { AbTest } from '../domain/ab-test.entity';
import { AbTestParticipant } from '../domain/ab-test-participant.entity';

export interface AbTestRepository {
  save(abTest: AbTest): Promise<AbTest>;
  findById(id: string): Promise<AbTest | null>;
  findByName(name: string): Promise<AbTest | null>;
  findAll(
    filters: any,
    sort: any,
    pagination: any,
  ): Promise<{ tests: AbTest[]; total: number; page: number; limit: number }>;
  findByIds(ids: string[]): Promise<AbTest[]>;
  findByStatus(status: string): Promise<AbTest[]>;
  findEligibleForUser(
    userId: string,
    userSegments?: string[],
    categories?: string[],
    channels?: string[],
  ): Promise<AbTest[]>;
  deleteById(id: string): Promise<void>;
}

export interface AbTestParticipantRepository {
  save(participant: AbTestParticipant): Promise<AbTestParticipant>;
  findByTestAndUser(testId: string, userId: string): Promise<AbTestParticipant | null>;
  findByTestId(testId: string): Promise<AbTestParticipant[]>;
  findByUserId(userId: string): Promise<AbTestParticipant[]>;
  deleteByTestId(testId: string): Promise<void>;
}
