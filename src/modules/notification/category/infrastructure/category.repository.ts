import { Category } from '../domain/category.entity';
import { CategoryQuery } from '../application/services/category.service';

export interface CategoryRepository {
  save(category: Category): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  findMany(
    query: CategoryQuery,
  ): Promise<{ categories: Category[]; total: number; page: number; limit: number }>;
  findTree(): Promise<Category[]>;
  findByUser(userId: string): Promise<Category[]>;
  search(searchTerm: string): Promise<Category[]>;
  delete(id: string): Promise<void>;
}
