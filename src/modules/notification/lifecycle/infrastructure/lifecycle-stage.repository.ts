import { LifecycleStage } from '../domain/lifecycle-stage.entity';
import { LifecycleStageQuery } from '../application/services/lifecycle-stage.service';

export interface LifecycleStageRepository {
  save(stage: LifecycleStage): Promise<LifecycleStage>;
  findById(id: string): Promise<LifecycleStage | null>;
  findByName(name: string): Promise<LifecycleStage | null>;
  findByOrder(order: number): Promise<LifecycleStage | null>;
  findMany(
    query: LifecycleStageQuery,
  ): Promise<{ stages: LifecycleStage[]; total: number; page: number; limit: number }>;
  findActive(): Promise<LifecycleStage[]>;
  findByOrderSequence(): Promise<LifecycleStage[]>;
  findByType(type: string): Promise<LifecycleStage[]>;
  findByUser(userId: string): Promise<LifecycleStage[]>;
  search(searchTerm: string): Promise<LifecycleStage[]>;
  delete(id: string): Promise<void>;
}
