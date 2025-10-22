import { createId } from '@paralleldrive/cuid2';

export class CuidUtil {
  static generate(): string {
    return createId();
  }

  static isValid(cuid: string): boolean {
    if (!cuid || typeof cuid !== 'string') {
      return false;
    }

    // CUID2 format: 24 characters, alphanumeric
    const cuidRegex = /^[a-z0-9]{24}$/;
    return cuidRegex.test(cuid);
  }

  static generateMultiple(count: number): string[] {
    return Array.from({ length: count }, () => this.generate());
  }
}
