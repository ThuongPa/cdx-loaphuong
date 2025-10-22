import { NovuClient } from '../../../../../infrastructure/external/novu/novu.client';
import { DeviceToken } from '../../domain/device-token.entity';
import { DeviceTokenRepository } from '../../domain/device-token.repository';
import { Injectable, Get, Logger, Inject } from '@nestjs/common';

@Injectable()
export class NovuSubscriberSyncService {
  private readonly logger = new Logger(NovuSubscriberSyncService.name);

  constructor(
    private readonly novuClient: NovuClient,
    @Inject('DeviceTokenRepository')
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  /**
   * Create or update subscriber in Novu when device token is registered
   */
  async syncSubscriberOnTokenRegistration(deviceToken: DeviceToken): Promise<void> {
    try {
      this.logger.log(`Syncing subscriber for token registration: ${deviceToken.id}`);

      // Check if subscriber already exists
      const existingSubscriber = await this.getSubscriberSafely(deviceToken.userId);

      if (existingSubscriber) {
        // Update existing subscriber with ALL active device tokens
        await this.updateSubscriberWithDeviceToken(deviceToken);
      } else {
        // Create new subscriber with ALL active device tokens
        await this.createSubscriberWithAllActiveTokens(deviceToken.userId);
      }

      this.logger.log(`Successfully synced subscriber for token: ${deviceToken.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync subscriber for token ${deviceToken.id}: ${error.message}`,
        error.stack,
      );
      // Don't throw error to prevent token registration failure
      // This will be handled by retry mechanism
    }
  }

  /**
   * Update subscriber in Novu when device token is updated
   */
  async syncSubscriberOnTokenUpdate(deviceToken: DeviceToken): Promise<void> {
    try {
      this.logger.log(`Syncing subscriber for token update: ${deviceToken.id}`);

      if (deviceToken.isActive) {
        // Token is active, update subscriber
        await this.updateSubscriberWithDeviceToken(deviceToken);
      } else {
        // Token is inactive, remove device info from subscriber
        await this.removeDeviceTokenFromSubscriber(deviceToken);
      }

      this.logger.log(`Successfully synced subscriber for token update: ${deviceToken.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync subscriber for token update ${deviceToken.id}: ${error.message}`,
        error.stack,
      );
      // Don't throw error to prevent token update failure
    }
  }

  /**
   * Remove device token info from subscriber when token is deleted
   */
  async syncSubscriberOnTokenDeletion(deviceToken: DeviceToken): Promise<void> {
    try {
      this.logger.log(`Syncing subscriber for token deletion: ${deviceToken.id}`);

      await this.removeDeviceTokenFromSubscriber(deviceToken);

      this.logger.log(`Successfully synced subscriber for token deletion: ${deviceToken.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync subscriber for token deletion ${deviceToken.id}: ${error.message}`,
        error.stack,
      );
      // Don't throw error to prevent token deletion failure
    }
  }

  private async createSubscriberWithDeviceToken(deviceToken: DeviceToken): Promise<void> {
    const subscriberData = {
      subscriberId: deviceToken.userId,
      data: {
        deviceTokens: [
          {
            id: deviceToken.id,
            token: deviceToken.token,
            platform: deviceToken.platform.value,
            provider: deviceToken.provider.value,
            deviceId: deviceToken.deviceId,
            isActive: deviceToken.isActive,
            lastUsedAt: deviceToken.lastUsedAt,
          },
        ],
        lastTokenUpdate: new Date().toISOString(),
      },
    };

    await this.novuClient.createSubscriber(subscriberData);
  }

  private async updateSubscriberWithDeviceToken(deviceToken: DeviceToken): Promise<void> {
    // Get current subscriber data
    const currentSubscriber = await this.getSubscriberSafely(deviceToken.userId);

    if (!currentSubscriber) {
      // If subscriber doesn't exist, create it with all active tokens
      await this.createSubscriberWithAllActiveTokens(deviceToken.userId);
      return;
    }

    // Get all active device tokens for this user from database
    const allActiveTokens = await this.getAllActiveDeviceTokens(deviceToken.userId);

    // Update subscriber with all active device tokens
    const updateData = {
      data: {
        ...currentSubscriber.data,
        deviceTokens: allActiveTokens,
        lastTokenUpdate: new Date().toISOString(),
      },
    };

    await this.novuClient.updateSubscriber(deviceToken.userId, updateData);
  }

  private async removeDeviceTokenFromSubscriber(deviceToken: DeviceToken): Promise<void> {
    // Get current subscriber data
    const currentSubscriber = await this.getSubscriberSafely(deviceToken.userId);

    if (!currentSubscriber) {
      this.logger.warn(`Subscriber not found for user ${deviceToken.userId}`);
      return;
    }

    // Get existing device tokens and remove the deleted one
    const existingTokens = currentSubscriber.data?.deviceTokens || [];
    const filteredTokens = existingTokens.filter((token: any) => token.id !== deviceToken.id);

    // Update subscriber with filtered device tokens
    const updateData = {
      data: {
        ...currentSubscriber.data,
        deviceTokens: filteredTokens,
        lastTokenUpdate: new Date().toISOString(),
      },
    };

    await this.novuClient.updateSubscriber(deviceToken.userId, updateData);
  }

  private async getSubscriberSafely(subscriberId: string): Promise<any> {
    try {
      return await this.novuClient.getSubscriber(subscriberId);
    } catch (error) {
      // If subscriber doesn't exist, return null instead of throwing
      if (error.message?.includes('not found') || error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create subscriber with all active device tokens for the user
   */
  private async createSubscriberWithAllActiveTokens(userId: string): Promise<void> {
    const allActiveTokens = await this.getAllActiveDeviceTokens(userId);

    const subscriberData = {
      subscriberId: userId,
      data: {
        deviceTokens: allActiveTokens,
        lastTokenUpdate: new Date().toISOString(),
      },
    };

    await this.novuClient.createSubscriber(subscriberData);
  }

  /**
   * Get all active device tokens for a user from database
   */
  private async getAllActiveDeviceTokens(userId: string): Promise<any[]> {
    try {
      // Get all active device tokens for the user
      const activeTokens = await this.deviceTokenRepository.findByUserIdAndActive(userId, true);

      this.logger.log(`Found ${activeTokens.length} active device tokens for user ${userId}`);

      // Convert to Novu format
      return activeTokens.map((token) => ({
        id: token.id,
        token: token.token,
        platform: token.platform.value,
        provider: token.provider.value,
        deviceId: token.deviceId,
        isActive: token.isActive,
        lastUsedAt: token.lastUsedAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get active device tokens for user ${userId}: ${error.message}`);
      return [];
    }
  }
}
