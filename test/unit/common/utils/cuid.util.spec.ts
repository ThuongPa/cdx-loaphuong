import { CuidUtil } from 'src/common/utils/cuid.util';

describe('CuidUtil', () => {
  describe('generate', () => {
    it('should generate a valid CUID', () => {
      const cuid = CuidUtil.generate();

      expect(cuid).toBeDefined();
      expect(typeof cuid).toBe('string');
      expect(cuid.length).toBe(24);
      // CUID2 doesn't start with 'c' like CUID v1
      expect(cuid).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate unique CUIDs', () => {
      const cuid1 = CuidUtil.generate();
      const cuid2 = CuidUtil.generate();

      expect(cuid1).not.toBe(cuid2);
    });
  });

  describe('isValid', () => {
    it('should return true for valid CUID', () => {
      const validCuid = CuidUtil.generate();

      expect(CuidUtil.isValid(validCuid)).toBe(true);
    });

    it('should return false for invalid CUID', () => {
      const invalidCuid = 'invalid-cuid';

      expect(CuidUtil.isValid(invalidCuid)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(CuidUtil.isValid('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(CuidUtil.isValid(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(CuidUtil.isValid(undefined as any)).toBe(false);
    });
  });

  describe('generateMultiple', () => {
    it('should generate multiple CUIDs', () => {
      const count = 5;
      const cuids = CuidUtil.generateMultiple(count);

      expect(cuids).toHaveLength(count);
      expect(cuids.every((cuid: string) => CuidUtil.isValid(cuid))).toBe(true);
    });

    it('should generate unique CUIDs', () => {
      const count = 10;
      const cuids = CuidUtil.generateMultiple(count);
      const uniqueCuids = new Set(cuids);

      expect(uniqueCuids.size).toBe(count);
    });
  });
});
