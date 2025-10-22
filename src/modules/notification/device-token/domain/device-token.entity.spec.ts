import { DeviceToken, DevicePlatform, PushProvider } from './device-token.entity';
import { DevicePlatformVO } from './value-objects/device-platform.vo';
import { PushProviderVO } from './value-objects/push-provider.vo';

describe('DeviceToken Entity', () => {
  describe('createFromRaw', () => {
    it('should create device token with valid data', () => {
      const rawData = {
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
        isActive: true,
      };

      const deviceToken = DeviceToken.createFromRaw({
        ...rawData,
        channel: 'push',
      });

      expect(deviceToken.userId).toBe(rawData.userId);
      expect(deviceToken.token).toBe(rawData.token);
      expect(deviceToken.platform.value).toBe(rawData.platform);
      expect(deviceToken.provider.value).toBe(rawData.provider);
      expect(deviceToken.deviceId).toBe(rawData.deviceId);
      expect(deviceToken.isActive).toBe(rawData.isActive);
      expect(deviceToken.id).toBeDefined();
      expect(deviceToken.createdAt).toBeDefined();
      expect(deviceToken.updatedAt).toBeDefined();
    });

    it('should create device token with default isActive true', () => {
      const rawData = {
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
      };

      const deviceToken = DeviceToken.createFromRaw({
        ...rawData,
        channel: 'push',
      });

      expect(deviceToken.isActive).toBe(true);
    });

    it('should throw error for incompatible provider-platform combination', () => {
      const rawData = {
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'ios',
        provider: 'fcm', // FCM is not compatible with iOS
        deviceId: 'device-123',
      };

      expect(() =>
        DeviceToken.createFromRaw({
          ...rawData,
          channel: 'push',
        }),
      ).toThrow('Provider fcm is not compatible with platform ios');
    });

    it('should throw error for invalid platform', () => {
      const rawData = {
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'invalid-platform',
        provider: 'expo',
        deviceId: 'device-123',
      };

      expect(() =>
        DeviceToken.createFromRaw({
          ...rawData,
          channel: 'push',
        }),
      ).toThrow('Invalid device platform: invalid-platform');
    });

    it('should throw error for invalid provider', () => {
      const rawData = {
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'invalid-provider',
        deviceId: 'device-123',
      };

      expect(() =>
        DeviceToken.createFromRaw({
          ...rawData,
          channel: 'push',
        }),
      ).toThrow('Invalid push provider: invalid-provider');
    });
  });

  describe('updateToken', () => {
    it('should update token with valid FCM format', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'old-token:format',
        platform: 'android',
        provider: 'fcm',
        deviceId: 'device-123',
        channel: 'push',
      });

      const newToken = 'new-token:new-token';
      deviceToken.updateToken(newToken);

      expect(deviceToken.token).toBe(newToken);
      expect(deviceToken.updatedAt.getTime()).toBeGreaterThanOrEqual(
        deviceToken.createdAt.getTime(),
      );
    });

    it('should update token with valid APNs format', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        platform: 'ios',
        provider: 'apns',
        deviceId: 'device-123',
        channel: 'push',
      });

      const newToken = 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678';
      deviceToken.updateToken(newToken);

      expect(deviceToken.token).toBe(newToken);
    });

    it('should update token with valid Expo format', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[old-token-format]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      const newToken = 'ExponentPushToken[new-token-123]';
      deviceToken.updateToken(newToken);

      expect(deviceToken.token).toBe(newToken);
    });

    it('should throw error for invalid FCM token format', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'old-token:format',
        platform: 'android',
        provider: 'fcm',
        deviceId: 'device-123',
        channel: 'push',
      });

      expect(() => deviceToken.updateToken('invalid-fcm-token')).toThrow(
        'Invalid FCM token format',
      );
    });

    it('should throw error for invalid APNs token format', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        platform: 'ios',
        provider: 'apns',
        deviceId: 'device-123',
        channel: 'push',
      });

      expect(() => deviceToken.updateToken('invalid-apns-token')).toThrow(
        'Invalid APNs token format',
      );
    });

    it('should throw error for invalid Expo token format', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[old-token-format]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      expect(() => deviceToken.updateToken('invalid-expo-token')).toThrow(
        'Invalid Expo token format',
      );
    });

    it('should throw error for empty token', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[old-token-format]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      expect(() => deviceToken.updateToken('')).toThrow('Device token cannot be empty');
    });
  });

  describe('markAsActive', () => {
    it('should mark token as active and update timestamp', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[test-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
        isActive: false,
      });

      const originalUpdatedAt = deviceToken.updatedAt;

      deviceToken.markAsActive();

      expect(deviceToken.isActive).toBe(true);
      expect(deviceToken.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('markAsInactive', () => {
    it('should mark token as inactive and update timestamp', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[test-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
        isActive: true,
      });

      const originalUpdatedAt = deviceToken.updatedAt;

      deviceToken.markAsInactive();

      expect(deviceToken.isActive).toBe(false);
      expect(deviceToken.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('updateLastUsed', () => {
    it('should update last used timestamp', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[test-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      expect(deviceToken.lastUsedAt).toBeUndefined();

      deviceToken.updateLastUsed();

      expect(deviceToken.lastUsedAt).toBeDefined();
      expect(deviceToken.lastUsedAt!.getTime()).toBeCloseTo(Date.now(), -2);
    });
  });

  describe('canBeUpdatedBy', () => {
    it('should return true for token owner', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[test-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      expect(deviceToken.canBeUpdatedBy('user-123')).toBe(true);
    });

    it('should return false for different user', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[test-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      expect(deviceToken.canBeUpdatedBy('user-456')).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false for token without lastUsedAt', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[test-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      expect(deviceToken.isExpired()).toBe(false);
    });

    it('should return false for recently used token', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[test-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      deviceToken.updateLastUsed();
      expect(deviceToken.isExpired()).toBe(false);
    });

    it('should return true for token not used for 90+ days', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[test-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      // Mock lastUsedAt to 91 days ago
      const ninetyOneDaysAgo = new Date();
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      // Use reflection to set private property for testing
      (deviceToken as any).props.lastUsedAt = ninetyOneDaysAgo;

      expect(deviceToken.isExpired()).toBe(true);
    });
  });

  describe('toPersistence', () => {
    it('should return persistence object with all properties', () => {
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[test-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      const persistence = deviceToken.toPersistence();

      expect(persistence.id).toBe(deviceToken.id);
      expect(persistence.userId).toBe(deviceToken.userId);
      expect(persistence.token).toBe(deviceToken.token);
      expect(persistence.platform).toBeInstanceOf(DevicePlatformVO);
      expect(persistence.provider).toBeInstanceOf(PushProviderVO);
      expect(persistence.deviceId).toBe(deviceToken.deviceId);
      expect(persistence.isActive).toBe(deviceToken.isActive);
      expect(persistence.createdAt).toBe(deviceToken.createdAt);
      expect(persistence.updatedAt).toBe(deviceToken.updatedAt);
    });
  });
});
