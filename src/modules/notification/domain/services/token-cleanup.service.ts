import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { NovuSubscriberService } from '../../../../infrastructure/external/novu/novu-subscriber.service';
import { ErrorType } from '../../../../common/services/error-classifier.service';
import { Injectable, Get, Res, Logger } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  DeviceToken,
  DeviceTokenSchema,
  DeviceTokenDocument,
} from '../../../../infrastructure/database/schemas/device-token.schema';

export interface TokenCleanupResult {
  success: boolean;
  tokensRemoved: number;
  subscribersRemoved: number;
  errors: string[];
}

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    @InjectModel(DeviceToken.name)
    private readonly deviceTokenModel: Model<DeviceTokenDocument>,
    private readonly novuSubscriberService: NovuSubscriberService,
  ) {}

  /**
   * Cleanup invalid device token for a specific user
   */
  async cleanupInvalidToken(
    userId: string,
    error: any,
    errorType: ErrorType = ErrorType.TOKEN_INVALID,
  ): Promise<TokenCleanupResult> {
    const result: TokenCleanupResult = {
      success: false,
      tokensRemoved: 0,
      subscribersRemoved: 0,
      errors: [],
    };

    try {
      this.logger.warn(`Cleaning up invalid tokens for user ${userId}`, {
        userId,
        error: error?.message,
        errorType,
      });

      // Find all device tokens for the user
      const deviceTokens = await this.deviceTokenModel.find({
        userId,
        isActive: true,
      });

      if (deviceTokens.length === 0) {
        this.logger.log(`No active device tokens found for user ${userId}`);
        result.success = true;
        return result;
      }

      // Process each token
      for (const token of deviceTokens) {
        try {
          await this.cleanupSingleToken(token, error, errorType);
          result.tokensRemoved++;
        } catch (tokenError) {
          const errorMsg = `Failed to cleanup token ${token.id}: ${tokenError.message}`;
          result.errors.push(errorMsg);
          this.logger.error(errorMsg, tokenError);
        }
      }

      // Remove user from Novu subscribers if all tokens are invalid
      if (result.tokensRemoved > 0) {
        try {
          await this.removeUserFromNovuSubscribers(userId);
          result.subscribersRemoved = 1;
        } catch (subscriberError) {
          const errorMsg = `Failed to remove user ${userId} from Novu subscribers: ${subscriberError.message}`;
          result.errors.push(errorMsg);
          this.logger.error(errorMsg, subscriberError);
        }
      }

      result.success = result.errors.length === 0;

      this.logger.log(`Token cleanup completed for user ${userId}`, {
        userId,
        tokensRemoved: result.tokensRemoved,
        subscribersRemoved: result.subscribersRemoved,
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      const errorMsg = `Token cleanup failed for user ${userId}: ${error.message}`;
      result.errors.push(errorMsg);
      this.logger.error(errorMsg, error);
      return result;
    }
  }

  /**
   * Cleanup a single device token
   */
  private async cleanupSingleToken(
    token: DeviceTokenDocument,
    error: any,
    errorType: ErrorType,
  ): Promise<void> {
    try {
      // Mark token as inactive
      await this.deviceTokenModel.updateOne(
        { id: token.id },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: this.getDeactivationReason(error, errorType),
            updatedAt: new Date(),
          },
        },
      );

      this.logger.log(`Device token ${token.id} marked as inactive`, {
        tokenId: token.id,
        userId: token.userId,
        platform: token.platform,
        deactivationReason: this.getDeactivationReason(error, errorType),
      });
    } catch (updateError) {
      this.logger.error(`Failed to deactivate token ${token.id}:`, updateError);
      throw updateError;
    }
  }

  /**
   * Remove user from Novu subscribers
   */
  private async removeUserFromNovuSubscribers(userId: string): Promise<void> {
    try {
      await this.novuSubscriberService.deleteSubscriber(userId);

      this.logger.log(`User ${userId} removed from Novu subscribers`, {
        userId,
      });
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from Novu subscribers:`, error);
      throw error;
    }
  }

  /**
   * Get deactivation reason based on error type
   */
  private getDeactivationReason(error: any, errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.TOKEN_INVALID:
        return `Invalid token: ${error?.message || 'Token validation failed'}`;
      case ErrorType.RATE_LIMITED:
        return `Rate limited: ${error?.message || 'Too many requests'}`;
      case ErrorType.NON_RETRYABLE:
        return `Non-retryable error: ${error?.message || 'Permanent failure'}`;
      default:
        return `Unknown error: ${error?.message || 'Token cleanup triggered'}`;
    }
  }

  /**
   * Bulk cleanup invalid tokens for multiple users
   */
  async bulkCleanupInvalidTokens(
    userIds: string[],
    error: any,
    errorType: ErrorType = ErrorType.TOKEN_INVALID,
  ): Promise<{
    totalProcessed: number;
    successful: number;
    failed: number;
    results: Array<{ userId: string; result: TokenCleanupResult }>;
  }> {
    const results: Array<{ userId: string; result: TokenCleanupResult }> = [];
    let successful = 0;
    let failed = 0;

    this.logger.log(`Starting bulk token cleanup for ${userIds.length} users`);

    for (const userId of userIds) {
      try {
        const result = await this.cleanupInvalidToken(userId, error, errorType);
        results.push({ userId, result });

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        const errorResult: TokenCleanupResult = {
          success: false,
          tokensRemoved: 0,
          subscribersRemoved: 0,
          errors: [`Bulk cleanup failed: ${error.message}`],
        };
        results.push({ userId, result: errorResult });
        failed++;
      }
    }

    this.logger.log(`Bulk token cleanup completed`, {
      totalProcessed: userIds.length,
      successful,
      failed,
    });

    return {
      totalProcessed: userIds.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Cleanup tokens by error pattern
   */
  async cleanupTokensByErrorPattern(
    errorPattern: string,
    daysOld: number = 7,
  ): Promise<{
    tokensProcessed: number;
    tokensRemoved: number;
    usersAffected: number;
  }> {
    try {
      this.logger.log(`Cleaning up tokens with error pattern: ${errorPattern}`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Find tokens with matching error patterns
      const tokensToCleanup = await this.deviceTokenModel.find({
        isActive: true,
        deactivationReason: { $regex: errorPattern, $options: 'i' },
        updatedAt: { $gte: cutoffDate },
      });

      if (tokensToCleanup.length === 0) {
        this.logger.log(`No tokens found matching error pattern: ${errorPattern}`);
        return {
          tokensProcessed: 0,
          tokensRemoved: 0,
          usersAffected: 0,
        };
      }

      // Group by user
      const userGroups = new Map<string, DeviceTokenDocument[]>();
      for (const token of tokensToCleanup) {
        if (!userGroups.has(token.userId)) {
          userGroups.set(token.userId, []);
        }
        userGroups.get(token.userId)!.push(token);
      }

      let tokensRemoved = 0;
      const usersAffected = userGroups.size;

      // Process each user's tokens
      for (const [userId, tokens] of userGroups.entries()) {
        try {
          const result = await this.cleanupInvalidToken(
            userId,
            { message: `Pattern cleanup: ${errorPattern}` },
            ErrorType.TOKEN_INVALID,
          );
          tokensRemoved += result.tokensRemoved;
        } catch (error) {
          this.logger.error(`Failed to cleanup tokens for user ${userId}:`, error);
        }
      }

      this.logger.log(`Pattern-based token cleanup completed`, {
        errorPattern,
        tokensProcessed: tokensToCleanup.length,
        tokensRemoved,
        usersAffected,
      });

      return {
        tokensProcessed: tokensToCleanup.length,
        tokensRemoved,
        usersAffected,
      };
    } catch (error) {
      this.logger.error(`Pattern-based token cleanup failed:`, error);
      throw error;
    }
  }

  /**
   * Get token cleanup statistics
   */
  async getTokenCleanupStatistics(): Promise<{
    totalTokens: number;
    activeTokens: number;
    inactiveTokens: number;
    tokensByPlatform: Record<string, number>;
    deactivationReasons: Record<string, number>;
    recentDeactivations: number;
  }> {
    try {
      const [
        totalTokens,
        activeTokens,
        inactiveTokens,
        tokensByPlatform,
        deactivationReasons,
        recentDeactivations,
      ] = await Promise.all([
        this.deviceTokenModel.countDocuments(),
        this.deviceTokenModel.countDocuments({ isActive: true }),
        this.deviceTokenModel.countDocuments({ isActive: false }),
        this.getTokensByPlatform(),
        this.getDeactivationReasons(),
        this.getRecentDeactivations(),
      ]);

      return {
        totalTokens,
        activeTokens,
        inactiveTokens,
        tokensByPlatform,
        deactivationReasons,
        recentDeactivations,
      };
    } catch (error) {
      this.logger.error('Failed to get token cleanup statistics:', error);
      throw error;
    }
  }

  /**
   * Get tokens grouped by platform
   */
  private async getTokensByPlatform(): Promise<Record<string, number>> {
    const pipeline = [
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ];

    const result = await this.deviceTokenModel.aggregate(pipeline);
    return result.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get deactivation reasons grouped by reason
   */
  private async getDeactivationReasons(): Promise<Record<string, number>> {
    const pipeline = [
      { $match: { isActive: false, deactivationReason: { $exists: true } } },
      { $group: { _id: '$deactivationReason', count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
      { $limit: 10 },
    ];

    const result = await this.deviceTokenModel.aggregate(pipeline);
    return result.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get recent deactivations (last 24 hours)
   */
  private async getRecentDeactivations(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return this.deviceTokenModel.countDocuments({
      isActive: false,
      deactivatedAt: { $gte: yesterday },
    });
  }
}
