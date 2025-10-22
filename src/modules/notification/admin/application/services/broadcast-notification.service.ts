import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Announcement,
  AnnouncementDocument,
} from '../../../../../infrastructure/database/schemas/announcement.schema';
import {
  UserNotification,
  UserNotificationDocument,
} from '../../../../../infrastructure/database/schemas/user-notification.schema';
import { AuthServiceClient } from '../../../../../infrastructure/external/auth-service/auth-service.client';
import { CircuitBreakerService } from '../../../../../infrastructure/external/circuit-breaker/circuit-breaker.service';
import {
  BroadcastNotificationDto,
  BroadcastNotificationResponseDto,
} from '../../interface/dto/broadcast-notification.dto';
import { NotificationPriority } from '../../../../../common/types/notification.types';

@Injectable()
export class BroadcastNotificationService {
  private readonly logger = new Logger(BroadcastNotificationService.name);

  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotificationDocument>,
    private readonly authServiceClient: AuthServiceClient,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  async createBroadcast(
    broadcastDto: BroadcastNotificationDto,
  ): Promise<BroadcastNotificationResponseDto> {
    this.logger.log('Creating broadcast notification', { broadcastDto });

    try {
      // Get target users
      const targetUsers = await this.getTargetUsers(broadcastDto);

      // Create announcement record
      const announcement = new this.announcementModel({
        title: broadcastDto.title,
        body: broadcastDto.body,
        targetRoles: broadcastDto.targetRoles,
        targetUsers: broadcastDto.targetUsers || [],
        channels: broadcastDto.channels,
        priority: broadcastDto.priority,
        scheduledAt: broadcastDto.scheduledAt ? new Date(broadcastDto.scheduledAt) : null,
        status: broadcastDto.scheduledAt ? 'scheduled' : 'active',
        data: broadcastDto.data || {},
        createdBy: 'admin', // This should come from the authenticated user
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedAnnouncement = await announcement.save();

      // Create user notifications if not scheduled
      if (!broadcastDto.scheduledAt) {
        await this.createUserNotifications(savedAnnouncement, targetUsers);
      }

      this.logger.log('Broadcast notification created successfully', {
        announcementId: savedAnnouncement._id,
        targetUserCount: targetUsers.length,
      });

      return {
        success: true,
        broadcastId: savedAnnouncement._id.toString(),
        targetUserCount: targetUsers.length,
        message: 'Broadcast notification created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating broadcast notification', error);
      throw error;
    }
  }

  private async getTargetUsers(broadcastDto: BroadcastNotificationDto): Promise<any[]> {
    const targetUsers: any[] = [];

    try {
      // Get users by roles
      if (broadcastDto.targetRoles.length > 0) {
        const usersByRoles = await this.circuitBreakerService.execute('auth-service', () =>
          this.authServiceClient.getUsersByRoles(broadcastDto.targetRoles),
        );
        targetUsers.push(...(usersByRoles as any[]));
      }

      // Get specific users
      if (broadcastDto.targetUsers && broadcastDto.targetUsers.length > 0) {
        const specificUsers = await Promise.all(
          broadcastDto.targetUsers.map((userId) =>
            this.circuitBreakerService.execute('auth-service', () =>
              this.authServiceClient.getUserById(userId),
            ),
          ),
        );
        targetUsers.push(...(specificUsers as any[]));
      }

      // Remove duplicates
      const uniqueUsers = targetUsers.filter(
        (user, index, self) => index === self.findIndex((u) => u.id === user.id),
      );

      return uniqueUsers;
    } catch (error) {
      this.logger.error('Error getting target users', error);
      throw error;
    }
  }

  private async createUserNotifications(
    announcement: AnnouncementDocument,
    targetUsers: any[],
  ): Promise<void> {
    const userNotifications = targetUsers.map((user) => ({
      userId: user.id,
      announcementId: announcement._id,
      title: announcement.title,
      body: announcement.body,
      type: 'announcement',
      channel: announcement.channels[0], // Use first channel for now
      priority: announcement.priority,
      status: 'pending',
      data: announcement.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await this.userNotificationModel.insertMany(userNotifications);

    this.logger.log('User notifications created', {
      count: userNotifications.length,
      announcementId: announcement._id,
    });
  }
}
