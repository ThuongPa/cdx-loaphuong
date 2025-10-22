import { FallbackStrategy } from '../domain/fallback-strategy.entity';
import { FallbackStrategyQuery } from '../application/services/fallback-strategy.service';

export interface FallbackStrategyRepository {
  save(strategy: FallbackStrategy): Promise<FallbackStrategy>;
  findById(id: string): Promise<FallbackStrategy | null>;
  findByName(name: string): Promise<FallbackStrategy | null>;
  findByPriority(priority: number): Promise<FallbackStrategy | null>;
  findMany(
    query: FallbackStrategyQuery,
  ): Promise<{ strategies: FallbackStrategy[]; total: number; page: number; limit: number }>;
  findActive(): Promise<FallbackStrategy[]>;
  findByPriorityOrder(): Promise<FallbackStrategy[]>;
  findByUser(userId: string): Promise<FallbackStrategy[]>;
  search(searchTerm: string): Promise<FallbackStrategy[]>;
  delete(id: string): Promise<void>;
}
