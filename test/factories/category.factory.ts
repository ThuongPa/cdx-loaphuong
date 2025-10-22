import { Category } from '../../src/infrastructure/database/schemas/category.schema';
import { CategoryType } from '../../src/common/enums/category-type.enum';
import { CuidUtil } from '../../src/common/utils/cuid.util';
import { DateUtil } from '../../src/common/utils/date.util';

export class CategoryFactory {
  static create(overrides: Partial<Category> = {}): Category {
    return {
      _id: CuidUtil.generate(),
      name: 'Test Category',
      description: 'Test category description',
      type: CategoryType.CUSTOM,
      isActive: true,
      createdBy: CuidUtil.generate(),
      createdAt: DateUtil.now(),
      updatedAt: DateUtil.now(),
      ...overrides,
    };
  }

  static createBuilding(overrides: Partial<Category> = {}): Category {
    return this.create({
      type: CategoryType.BUILDING,
      name: 'Building A',
      description: 'Main building',
      ...overrides,
    });
  }

  static createFloor(overrides: Partial<Category> = {}): Category {
    return this.create({
      type: CategoryType.FLOOR,
      name: 'Floor 1',
      description: 'First floor',
      ...overrides,
    });
  }

  static createApartment(overrides: Partial<Category> = {}): Category {
    return this.create({
      type: CategoryType.APARTMENT,
      name: 'Apartment 101',
      description: 'Apartment 101',
      ...overrides,
    });
  }

  static createInactive(overrides: Partial<Category> = {}): Category {
    return this.create({
      isActive: false,
      ...overrides,
    });
  }

  static createMultiple(count: number, overrides: Partial<Category> = {}): Category[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
