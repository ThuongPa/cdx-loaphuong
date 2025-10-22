import { UserPreferences } from './user-preferences.entity';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../../../common/types/notification.types';

describe('UserPreferences', () => {
  describe('createDefault', () => {
    it('should create default preferences with all channels and types enabled', () => {
      const userId = 'user_123';
      const preferences = UserPreferences.createDefault(userId);

      expect(preferences.userId).toBe(userId);
      expect(preferences.channelPreferences.email).toBe(true);
      expect(preferences.channelPreferences.sms).toBe(true);
      expect(preferences.channelPreferences.push).toBe(true);
      expect(preferences.channelPreferences.inApp).toBe(true);
      expect(preferences.channelPreferences.webhook).toBe(false);

      expect(preferences.typePreferences.emergency).toBe(true);
      expect(preferences.typePreferences.payment).toBe(true);
      expect(preferences.typePreferences.system).toBe(true);

      expect(preferences.quietHours.enabled).toBe(false);
    });
  });

  describe('shouldSendNotification', () => {
    let preferences: UserPreferences;

    beforeEach(() => {
      preferences = UserPreferences.createDefault('user_123');
    });

    it('should allow emergency notifications regardless of preferences', () => {
      const result = preferences.shouldSendNotification(
        NotificationType.EMERGENCY,
        NotificationChannel.PUSH,
        NotificationPriority.NORMAL,
      );
      expect(result).toBe(true);
    });

    it('should allow URGENT priority notifications regardless of preferences', () => {
      const result = preferences.shouldSendNotification(
        NotificationType.PAYMENT,
        NotificationChannel.PUSH,
        NotificationPriority.URGENT,
      );
      expect(result).toBe(true);
    });

    it('should respect channel and type preferences for normal notifications', () => {
      const result = preferences.shouldSendNotification(
        NotificationType.PAYMENT,
        NotificationChannel.PUSH,
        NotificationPriority.NORMAL,
      );
      expect(result).toBe(true);
    });

    it('should block notifications when channel is disabled', () => {
      const updatedPrefs = preferences.updateChannelPreferences({ push: false });
      const result = updatedPrefs.shouldSendNotification(
        NotificationType.PAYMENT,
        NotificationChannel.PUSH,
        NotificationPriority.NORMAL,
      );
      expect(result).toBe(false);
    });

    it('should block notifications when type is disabled', () => {
      const updatedPrefs = preferences.updateTypePreferences({ payment: false });
      const result = updatedPrefs.shouldSendNotification(
        NotificationType.PAYMENT,
        NotificationChannel.PUSH,
        NotificationPriority.NORMAL,
      );
      expect(result).toBe(false);
    });
  });

  describe('updateChannelPreferences', () => {
    it('should update channel preferences', () => {
      const preferences = UserPreferences.createDefault('user_123');
      const updated = preferences.updateChannelPreferences({ push: false, email: false });

      expect(updated.channelPreferences.push).toBe(false);
      expect(updated.channelPreferences.email).toBe(false);
      expect(updated.channelPreferences.sms).toBe(true); // unchanged
    });
  });

  describe('updateTypePreferences', () => {
    it('should update type preferences but keep emergency enabled', () => {
      const preferences = UserPreferences.createDefault('user_123');
      const updated = preferences.updateTypePreferences({
        payment: false,
        emergency: false, // This should be ignored
      });

      expect(updated.typePreferences.payment).toBe(false);
      expect(updated.typePreferences.emergency).toBe(true); // Always true
    });
  });

  describe('updateQuietHours', () => {
    it('should update quiet hours', () => {
      const preferences = UserPreferences.createDefault('user_123');
      const updated = preferences.updateQuietHours({
        enabled: true,
        startTime: '23:00',
        endTime: '07:00',
      });

      expect(updated.quietHours.enabled).toBe(true);
      expect(updated.quietHours.startTime).toBe('23:00');
      expect(updated.quietHours.endTime).toBe('07:00');
    });
  });
});
