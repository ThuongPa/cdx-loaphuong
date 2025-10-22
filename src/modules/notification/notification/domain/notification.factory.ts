import { NotificationAggregate, NotificationData } from './notification.aggregate';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';
import { Param } from '@nestjs/common';
import { Type } from 'class-transformer';
import { NotificationTypeVO } from './value-objects/notification-type.vo';
import { NotificationPriorityVO } from './value-objects/notification-priority.vo';
import { NotificationChannelVO } from './value-objects/notification-channel.vo';
import { NotificationStatusVO } from './value-objects/notification-status.vo';

export interface CreateNotificationParams {
  title: string;
  body: string;
  type: string;
  priority: string;
  channels: string[];
  targetRoles?: string[];
  targetUsers?: string[];
  data?: Record<string, any>;
}

export class NotificationFactory {
  /**
   * Create notification from event data
   */
  static fromEventData(params: CreateNotificationParams): NotificationAggregate {
    return NotificationAggregate.fromEventData({
      title: params.title,
      body: params.body,
      type: params.type,
      priority: params.priority,
      channels: params.channels,
      targetRoles: params.targetRoles,
      targetUsers: params.targetUsers,
      data: params.data,
    });
  }

  /**
   * Create notification from database data
   */
  static fromDatabaseData(data: any): NotificationAggregate {
    const notificationData: NotificationData = {
      id: data.id,
      title: data.title,
      body: data.body,
      type: NotificationTypeVO.fromString(data.type),
      priority: NotificationPriorityVO.fromString(data.priority),
      channels: data.channels.map((ch: string) => NotificationChannelVO.fromString(ch)),
      targetRoles: data.targetRoles,
      targetUsers: data.targetUsers,
      data: data.data,
      status: NotificationStatusVO.fromString(data.status),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    return new NotificationAggregate(notificationData);
  }

  /**
   * Create emergency notification
   */
  static createEmergencyNotification(
    title: string,
    body: string,
    targetRoles: string[],
    channels: string[] = ['push', 'inApp'],
  ): NotificationAggregate {
    return this.fromEventData({
      title,
      body,
      type: 'emergency',
      priority: 'urgent',
      channels,
      targetRoles,
      data: { isEmergency: true },
    });
  }

  /**
   * Create payment notification
   */
  static createPaymentNotification(
    title: string,
    body: string,
    targetUsers: string[],
    paymentData: Record<string, any>,
  ): NotificationAggregate {
    return this.fromEventData({
      title,
      body,
      type: 'payment',
      priority: 'high',
      channels: ['push', 'inApp'],
      targetUsers,
      data: { ...paymentData, type: 'payment' },
    });
  }

  /**
   * Create booking notification
   */
  static createBookingNotification(
    title: string,
    body: string,
    targetUsers: string[],
    bookingData: Record<string, any>,
  ): NotificationAggregate {
    return this.fromEventData({
      title,
      body,
      type: 'booking',
      priority: 'normal',
      channels: ['push', 'inApp', 'email'],
      targetUsers,
      data: { ...bookingData, type: 'booking' },
    });
  }

  /**
   * Create announcement notification
   */
  static createAnnouncementNotification(
    title: string,
    body: string,
    targetRoles: string[],
    announcementData: Record<string, any>,
  ): NotificationAggregate {
    return this.fromEventData({
      title,
      body,
      type: 'announcement',
      priority: 'normal',
      channels: ['push', 'inApp', 'email'],
      targetRoles,
      data: { ...announcementData, type: 'announcement' },
    });
  }
}
