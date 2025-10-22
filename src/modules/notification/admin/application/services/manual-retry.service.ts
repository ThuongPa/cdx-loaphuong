import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../../../infrastructure/database/schemas/user-notification.schema';
import {
  ManualRetryDto,
  ManualRetryResponseDto,
} from '../../interface/dto/failed-notification.dto';

@Injectable()
export class ManualRetryService {
  private readonly logger = new Logger(ManualRetryService.name);

  constructor(
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotificationDocument>,
  ) {}

  async retryNotification(
    notificationId: string,
    retryDto: ManualRetryDto,
  ): Promise<ManualRetryResponseDto> {
    this.logger.log('Manually retrying notification', { notificationId, retryDto });

    try {
      // Find the failed notification
      const notification = await this.userNotificationModel.findById(notificationId);
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.status !== 'failed') {
        throw new Error('Notification is not in failed status');
      }

      // Create retry record
      const retryId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update notification status to pending for retry
      await this.userNotificationModel.findByIdAndUpdate(notificationId, {
        status: 'pending',
        retryCount: (notification.retryCount || 0) + 1,
        lastRetryAt: new Date(),
        retryReason: retryDto.reason || 'Manual retry by admin',
        updatedAt: new Date(),
      });

      this.logger.log('Notification retry initiated successfully', {
        notificationId,
        retryId,
        retryCount: (notification.retryCount || 0) + 1,
      });

      return {
        success: true,
        retryId,
        message: 'Notification retry initiated successfully',
      };
    } catch (error) {
      this.logger.error('Error retrying notification', error);
      throw error;
    }
  }
}
