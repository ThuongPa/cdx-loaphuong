import { Segment } from '../domain/segment.entity';
import { SegmentQuery } from '../application/services/segment.service';

export interface SegmentRepository {
  save(segment: Segment): Promise<Segment>;
  findById(id: string): Promise<Segment | null>;
  findByName(name: string): Promise<Segment | null>;
  findMany(
    query: SegmentQuery,
  ): Promise<{ segments: Segment[]; total: number; page: number; limit: number }>;
  findActive(): Promise<Segment[]>;
  findByUser(userId: string): Promise<Segment[]>;
  search(searchTerm: string): Promise<Segment[]>;
  delete(id: string): Promise<void>;
}
