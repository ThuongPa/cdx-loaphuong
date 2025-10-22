import { ConfigService } from '@nestjs/config';
import { NovuClient } from './novu.client';
import { AuthServiceClient } from '../auth-service/auth-service.client';
import { Injectable, Get, Delete, Logger } from '@nestjs/common';

export interface SubscriberData {
  subscriberId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  data?: Record<string, any>;
}

export interface UserFromAuthService {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}

@Injectable()
export class NovuSubscriberService {
  private readonly logger = new Logger(NovuSubscriberService.name);

  constructor(
    private readonly novuClient: NovuClient,
    private readonly authServiceClient: AuthServiceClient,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create subscriber when user registers push token for first time
   */
  async createSubscriberFromUser(userId: string): Promise<void> {
    try {
      this.logger.log(`Creating subscriber for user: ${userId}`);

      // Get user data from Auth Service
      const userData = await this.authServiceClient.getUserById(userId);

      if (!userData) {
        throw new Error(`User not found: ${userId}`);
      }

      // Create subscriber in Novu
      await this.novuClient.createSubscriber({
        subscriberId: userId,
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        data: {
          roles: userData.roles,
          createdAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Subscriber created successfully for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to create subscriber for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create subscriber with provided user data (from event)
   */
  async createSubscriberWithData(userData: {
    userId: string;
    email: string;
    phone?: string;
    name: string;
    role: string;
    apartment?: string;
    building?: string;
    isActive?: boolean;
  }): Promise<void> {
    try {
      this.logger.log(`Creating subscriber with provided data for user: ${userData.userId}`);

      // Create subscriber in Novu using provided data
      await this.novuClient.createSubscriber({
        subscriberId: userData.userId,
        email: userData.email,
        phone: userData.phone,
        firstName: userData.name?.split(' ')[0] || '',
        lastName: userData.name?.split(' ').slice(1).join(' ') || '',
        data: {
          roles: [userData.role],
          apartment: userData.apartment,
          building: userData.building,
          isActive: userData.isActive,
          createdAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Subscriber created successfully for user: ${userData.userId}`);
    } catch (error) {
      this.logger.error(`Failed to create subscriber for user ${userData.userId}:`, error);
      throw error;
    }
  }

  /**
   * Update subscriber with provided data (from event)
   */
  async updateSubscriberWithData(
    userId: string,
    data: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      this.logger.log(`Updating subscriber with provided data for user: ${userId}`);

      // Update subscriber in Novu using provided data
      await this.novuClient.updateSubscriber(userId, {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        data: data.data,
      });

      this.logger.log(`Subscriber updated successfully for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update subscriber for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update subscriber data from Auth Service
   */
  async syncSubscriberFromAuthService(userId: string): Promise<void> {
    try {
      this.logger.log(`Syncing subscriber data for user: ${userId}`);

      // Get updated user data from Auth Service
      const userData = await this.authServiceClient.getUserById(userId);

      if (!userData) {
        this.logger.warn(`User not found in Auth Service: ${userId}`);
        return;
      }

      // Update subscriber in Novu
      await this.novuClient.updateSubscriber(userId, {
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        data: {
          roles: userData.roles,
          lastSyncAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Subscriber synced successfully for user: ${userId}`);
    } catch (error) {
      // Check if it's a circuit breaker error
      if (
        error.message?.includes('Circuit breaker') ||
        error.message?.includes('auth-service is OPEN')
      ) {
        this.logger.warn(
          `Circuit breaker is open for auth-service, skipping Novu sync for user: ${userId}`,
        );
        // Don't throw error to prevent queue retry loops
        return;
      }

      this.logger.error(`Failed to sync subscriber for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update subscriber preferences
   */
  async updateSubscriberPreferences(
    userId: string,
    preferences: {
      channels?: string[];
      types?: string[];
      frequency?: string;
    },
  ): Promise<void> {
    try {
      this.logger.log(`Updating preferences for subscriber: ${userId}`);

      await this.novuClient.updateSubscriber(userId, {
        data: {
          preferences: {
            channels: preferences.channels,
            types: preferences.types,
            frequency: preferences.frequency,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Preferences updated successfully for subscriber: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update preferences for subscriber ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get subscriber data
   */
  async getSubscriber(userId: string): Promise<any> {
    try {
      this.logger.log(`Getting subscriber data for user: ${userId}`);

      const subscriber = await this.novuClient.getSubscriber(userId);

      this.logger.log(`Subscriber data retrieved for user: ${userId}`);
      return subscriber;
    } catch (error) {
      this.logger.error(`Failed to get subscriber data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete subscriber when user is deleted
   */
  async deleteSubscriber(userId: string): Promise<void> {
    try {
      this.logger.log(`Deleting subscriber for user: ${userId}`);

      await this.novuClient.deleteSubscriber(userId);

      this.logger.log(`Subscriber deleted successfully for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete subscriber for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if subscriber exists
   */
  async subscriberExists(userId: string): Promise<boolean> {
    try {
      await this.novuClient.getSubscriber(userId);
      return true;
    } catch (error) {
      if (error.message?.includes('not found') || error.status === 404) {
        return false;
      }
      throw error;
    }
  }
}
