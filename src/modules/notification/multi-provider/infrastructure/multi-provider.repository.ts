import { MultiProvider } from '../domain/multi-provider.entity';
import { MultiProviderFilters } from '../application/services/multi-provider.service';

export interface MultiProviderRepository {
  create(multiProvider: MultiProvider): Promise<MultiProvider>;
  findById(id: string): Promise<MultiProvider | null>;
  findByName(name: string): Promise<MultiProvider | null>;
  find(filters: MultiProviderFilters): Promise<{
    multiProviders: MultiProvider[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  update(id: string, multiProvider: MultiProvider): Promise<MultiProvider>;
  delete(id: string): Promise<void>;
  findByType(type: string): Promise<MultiProvider[]>;
  findActive(): Promise<MultiProvider[]>;
  findByPriority(): Promise<MultiProvider[]>;
  getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    active: number;
    inactive: number;
    averagePriority: number;
  }>;
  export(
    filters: MultiProviderFilters,
    format: 'json' | 'csv' | 'excel',
  ): Promise<{
    data: any;
    format: string;
    count: number;
    timestamp: Date;
  }>;
}
