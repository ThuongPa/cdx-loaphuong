import { DateUtil } from 'src/common/utils/date.util';

describe('DateUtil', () => {
  describe('now', () => {
    it('should return current date', () => {
      const now = DateUtil.now();

      expect(now).toBeInstanceOf(Date);
      expect(now.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('toISOString', () => {
    it('should convert date to ISO string', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const isoString = DateUtil.toISOString(date);

      expect(isoString).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('fromISOString', () => {
    it('should convert ISO string to date', () => {
      const isoString = '2024-01-01T00:00:00.000Z';
      const date = DateUtil.fromISOString(isoString);

      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(new Date('2024-01-01T00:00:00.000Z').getTime());
    });
  });

  describe('addDays', () => {
    it('should add days to date', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = DateUtil.addDays(date, 5);

      expect(result.getDate()).toBe(6);
    });

    it('should handle negative days', () => {
      const date = new Date('2024-01-06T00:00:00.000Z');
      const result = DateUtil.addDays(date, -5);

      expect(result.getDate()).toBe(1);
    });
  });

  describe('addHours', () => {
    it('should add hours to date', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = DateUtil.addHours(date, 5);

      expect(result.getUTCHours()).toBe(5);
    });
  });

  describe('addMinutes', () => {
    it('should add minutes to date', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = DateUtil.addMinutes(date, 30);

      expect(result.getMinutes()).toBe(30);
    });
  });

  describe('isAfter', () => {
    it('should return true if first date is after second date', () => {
      const date1 = new Date('2024-01-02T00:00:00.000Z');
      const date2 = new Date('2024-01-01T00:00:00.000Z');

      expect(DateUtil.isAfter(date1, date2)).toBe(true);
    });

    it('should return false if first date is before second date', () => {
      const date1 = new Date('2024-01-01T00:00:00.000Z');
      const date2 = new Date('2024-01-02T00:00:00.000Z');

      expect(DateUtil.isAfter(date1, date2)).toBe(false);
    });
  });

  describe('isBefore', () => {
    it('should return true if first date is before second date', () => {
      const date1 = new Date('2024-01-01T00:00:00.000Z');
      const date2 = new Date('2024-01-02T00:00:00.000Z');

      expect(DateUtil.isBefore(date1, date2)).toBe(true);
    });

    it('should return false if first date is after second date', () => {
      const date1 = new Date('2024-01-02T00:00:00.000Z');
      const date2 = new Date('2024-01-01T00:00:00.000Z');

      expect(DateUtil.isBefore(date1, date2)).toBe(false);
    });
  });

  describe('isEqual', () => {
    it('should return true if dates are equal', () => {
      const date1 = new Date('2024-01-01T00:00:00.000Z');
      const date2 = new Date('2024-01-01T00:00:00.000Z');

      expect(DateUtil.isEqual(date1, date2)).toBe(true);
    });

    it('should return false if dates are not equal', () => {
      const date1 = new Date('2024-01-01T00:00:00.000Z');
      const date2 = new Date('2024-01-02T00:00:00.000Z');

      expect(DateUtil.isEqual(date1, date2)).toBe(false);
    });
  });

  describe('differenceInMinutes', () => {
    it('should calculate difference in minutes', () => {
      const date1 = new Date('2024-01-01T01:00:00.000Z');
      const date2 = new Date('2024-01-01T00:00:00.000Z');

      expect(DateUtil.differenceInMinutes(date1, date2)).toBe(60);
    });
  });

  describe('differenceInHours', () => {
    it('should calculate difference in hours', () => {
      const date1 = new Date('2024-01-01T02:00:00.000Z');
      const date2 = new Date('2024-01-01T00:00:00.000Z');

      expect(DateUtil.differenceInHours(date1, date2)).toBe(2);
    });
  });

  describe('differenceInDays', () => {
    it('should calculate difference in days', () => {
      const date1 = new Date('2024-01-03T00:00:00.000Z');
      const date2 = new Date('2024-01-01T00:00:00.000Z');

      expect(DateUtil.differenceInDays(date1, date2)).toBe(2);
    });
  });
});
