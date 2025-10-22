import { DevicePlatformVO, DevicePlatform } from './device-platform.vo';

describe('DevicePlatformVO', () => {
  describe('create', () => {
    it('should create valid iOS platform', () => {
      const platform = DevicePlatformVO.create('ios');

      expect(platform.value).toBe(DevicePlatform.IOS);
      expect(platform.isIOS()).toBe(true);
      expect(platform.isAndroid()).toBe(false);
      expect(platform.isWeb()).toBe(false);
    });

    it('should create valid Android platform', () => {
      const platform = DevicePlatformVO.create('android');

      expect(platform.value).toBe(DevicePlatform.ANDROID);
      expect(platform.isIOS()).toBe(false);
      expect(platform.isAndroid()).toBe(true);
      expect(platform.isWeb()).toBe(false);
    });

    it('should create valid Web platform', () => {
      const platform = DevicePlatformVO.create('web');

      expect(platform.value).toBe(DevicePlatform.WEB);
      expect(platform.isIOS()).toBe(false);
      expect(platform.isAndroid()).toBe(false);
      expect(platform.isWeb()).toBe(true);
    });

    it('should handle case insensitive input', () => {
      const platform = DevicePlatformVO.create('IOS');

      expect(platform.value).toBe(DevicePlatform.IOS);
    });

    it('should trim whitespace', () => {
      const platform = DevicePlatformVO.create('  android  ');

      expect(platform.value).toBe(DevicePlatform.ANDROID);
    });

    it('should throw error for invalid platform', () => {
      expect(() => DevicePlatformVO.create('invalid')).toThrow(
        'Invalid device platform: invalid. Supported platforms: ios, android, web',
      );
    });

    it('should throw error for empty platform', () => {
      expect(() => DevicePlatformVO.create('')).toThrow(
        'Invalid device platform: . Supported platforms: ios, android, web',
      );
    });
  });

  describe('equals', () => {
    it('should return true for same platform', () => {
      const platform1 = DevicePlatformVO.create('ios');
      const platform2 = DevicePlatformVO.create('ios');

      expect(platform1.equals(platform2)).toBe(true);
    });

    it('should return false for different platforms', () => {
      const platform1 = DevicePlatformVO.create('ios');
      const platform2 = DevicePlatformVO.create('android');

      expect(platform1.equals(platform2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const platform = DevicePlatformVO.create('ios');

      expect(platform.toString()).toBe('ios');
    });
  });
});
