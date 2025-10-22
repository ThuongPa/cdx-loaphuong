import {
  NotificationType,
  NotificationPriority,
} from '../../../../../common/types/notification.types';
import { UserPreferences } from '../user-preferences.entity';

export class EmergencyOverridePolicy {
  static shouldOverridePreferences(
    type: NotificationType,
    priority: NotificationPriority,
    preferences: UserPreferences,
  ): boolean {
    // Emergency notifications always override preferences
    if (type === NotificationType.EMERGENCY) {
      return true;
    }

    // URGENT priority notifications override preferences
    if (priority === NotificationPriority.URGENT) {
      return true;
    }

    // Security notifications override quiet hours
    if (type === NotificationType.SECURITY) {
      return true;
    }

    return false;
  }

  static getEffectiveChannels(
    requestedChannels: string[],
    type: NotificationType,
    priority: NotificationPriority,
    preferences: UserPreferences,
  ): string[] {
    if (this.shouldOverridePreferences(type, priority, preferences)) {
      return requestedChannels;
    }

    // Filter channels based on user preferences
    return requestedChannels.filter((channel) => preferences.isChannelEnabled(channel as any));
  }
}
