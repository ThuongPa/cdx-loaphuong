import { User } from '../../src/infrastructure/database/schemas/user.schema';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { CuidUtil } from '../../src/common/utils/cuid.util';
import { DateUtil } from '../../src/common/utils/date.util';

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      _id: CuidUtil.generate(),
      email: 'test@example.com',
      phone: '+84901234567',
      roles: [UserRole.RESIDENT],
      isActive: true,
      lastSyncedAt: DateUtil.now(),
      createdAt: DateUtil.now(),
      updatedAt: DateUtil.now(),
      ...overrides,
    };
  }

  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      roles: [UserRole.ADMIN],
      ...overrides,
    });
  }

  static createManager(overrides: Partial<User> = {}): User {
    return this.create({
      roles: [UserRole.MANAGER],
      ...overrides,
    });
  }

  static createInactive(overrides: Partial<User> = {}): User {
    return this.create({
      isActive: false,
      ...overrides,
    });
  }

  static createMultiple(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
