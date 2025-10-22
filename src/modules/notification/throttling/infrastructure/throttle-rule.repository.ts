import { ThrottleRule } from '../domain/throttle-rule.entity';
import { ThrottleRuleQuery } from '../application/services/throttle-rule.service';

export interface ThrottleRuleRepository {
  save(rule: ThrottleRule): Promise<ThrottleRule>;
  findById(id: string): Promise<ThrottleRule | null>;
  findByName(name: string): Promise<ThrottleRule | null>;
  findMany(
    query: ThrottleRuleQuery,
  ): Promise<{ rules: ThrottleRule[]; total: number; page: number; limit: number }>;
  findActive(): Promise<ThrottleRule[]>;
  findByType(type: string): Promise<ThrottleRule[]>;
  findByUser(userId: string): Promise<ThrottleRule[]>;
  search(searchTerm: string): Promise<ThrottleRule[]>;
  delete(id: string): Promise<void>;
}
