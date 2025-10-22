import { PushProviderVO, PushProvider } from './push-provider.vo';

describe('PushProviderVO', () => {
  describe('create', () => {
    it('should create valid FCM provider', () => {
      const provider = PushProviderVO.create('fcm');

      expect(provider.value).toBe(PushProvider.FCM);
      expect(provider.isFCM()).toBe(true);
      expect(provider.isAPNS()).toBe(false);
      expect(provider.isExpo()).toBe(false);
    });

    it('should create valid APNs provider', () => {
      const provider = PushProviderVO.create('apns');

      expect(provider.value).toBe(PushProvider.APNS);
      expect(provider.isFCM()).toBe(false);
      expect(provider.isAPNS()).toBe(true);
      expect(provider.isExpo()).toBe(false);
    });

    it('should create valid Expo provider', () => {
      const provider = PushProviderVO.create('expo');

      expect(provider.value).toBe(PushProvider.EXPO);
      expect(provider.isFCM()).toBe(false);
      expect(provider.isAPNS()).toBe(false);
      expect(provider.isExpo()).toBe(true);
    });

    it('should handle case insensitive input', () => {
      const provider = PushProviderVO.create('FCM');

      expect(provider.value).toBe(PushProvider.FCM);
    });

    it('should trim whitespace', () => {
      const provider = PushProviderVO.create('  expo  ');

      expect(provider.value).toBe(PushProvider.EXPO);
    });

    it('should throw error for invalid provider', () => {
      expect(() => PushProviderVO.create('invalid')).toThrow(
        'Invalid push provider: invalid. Supported providers: fcm, apns, expo',
      );
    });

    it('should throw error for empty provider', () => {
      expect(() => PushProviderVO.create('')).toThrow(
        'Invalid push provider: . Supported providers: fcm, apns, expo',
      );
    });
  });

  describe('isCompatibleWith', () => {
    it('should return true for FCM with Android', () => {
      const provider = PushProviderVO.create('fcm');

      expect(provider.isCompatibleWith('android')).toBe(true);
    });

    it('should return true for FCM with Web', () => {
      const provider = PushProviderVO.create('fcm');

      expect(provider.isCompatibleWith('web')).toBe(true);
    });

    it('should return false for FCM with iOS', () => {
      const provider = PushProviderVO.create('fcm');

      expect(provider.isCompatibleWith('ios')).toBe(false);
    });

    it('should return true for APNs with iOS', () => {
      const provider = PushProviderVO.create('apns');

      expect(provider.isCompatibleWith('ios')).toBe(true);
    });

    it('should return false for APNs with Android', () => {
      const provider = PushProviderVO.create('apns');

      expect(provider.isCompatibleWith('android')).toBe(false);
    });

    it('should return true for Expo with iOS', () => {
      const provider = PushProviderVO.create('expo');

      expect(provider.isCompatibleWith('ios')).toBe(true);
    });

    it('should return true for Expo with Android', () => {
      const provider = PushProviderVO.create('expo');

      expect(provider.isCompatibleWith('android')).toBe(true);
    });

    it('should return false for Expo with Web', () => {
      const provider = PushProviderVO.create('expo');

      expect(provider.isCompatibleWith('web')).toBe(false);
    });

    it('should handle case insensitive platform', () => {
      const provider = PushProviderVO.create('fcm');

      expect(provider.isCompatibleWith('ANDROID')).toBe(true);
    });
  });

  describe('getDefaultPlatform', () => {
    it('should return android for FCM', () => {
      const provider = PushProviderVO.create('fcm');

      expect(provider.getDefaultPlatform()).toBe('android');
    });

    it('should return ios for APNs', () => {
      const provider = PushProviderVO.create('apns');

      expect(provider.getDefaultPlatform()).toBe('ios');
    });

    it('should return android for Expo', () => {
      const provider = PushProviderVO.create('expo');

      expect(provider.getDefaultPlatform()).toBe('android');
    });
  });

  describe('equals', () => {
    it('should return true for same provider', () => {
      const provider1 = PushProviderVO.create('fcm');
      const provider2 = PushProviderVO.create('fcm');

      expect(provider1.equals(provider2)).toBe(true);
    });

    it('should return false for different providers', () => {
      const provider1 = PushProviderVO.create('fcm');
      const provider2 = PushProviderVO.create('apns');

      expect(provider1.equals(provider2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const provider = PushProviderVO.create('fcm');

      expect(provider.toString()).toBe('fcm');
    });
  });
});
