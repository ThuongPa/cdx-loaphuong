import { NotificationAggregate } from '../domain/notification.aggregate';
import { NotificationFactory } from '../domain/notification.factory';
import { Notification } from '../../../../infrastructure/database/schemas/notification.schema';
import { UserNotification } from '../../../../infrastructure/database/schemas/user-notification.schema';
import { Document, Types } from 'mongoose';
import { Type } from 'class-transformer';

export class NotificationMapper {
  /**
   * Map database document to domain aggregate
   */
  static toDomain(document: any): NotificationAggregate {
    return NotificationFactory.fromDatabaseData(document);
  }

  /**
   * Map domain aggregate to database document
   */
  static toDocument(aggregate: NotificationAggregate): Partial<Notification> {
    return aggregate.toPlainObject();
  }

  /**
   * Map domain aggregate to user notification document
   */
  static toUserNotificationDocument(
    aggregate: NotificationAggregate,
    userId: string,
    channel: string,
    additionalData: {
      status?: string;
      sentAt?: Date;
      deliveredAt?: Date;
      errorMessage?: string;
      errorCode?: string;
      retryCount?: number;
      deliveryId?: string;
    } = {},
  ): Partial<UserNotification> {
    return {
      // id: `${aggregate.id}_${userId}_${channel}`,
      userId,
      notificationId: aggregate.id,
      title: aggregate.title,
      body: aggregate.body,
      type: aggregate.type.getValue(),
      channel: channel as any,
      priority: aggregate.priority.getValue(),
      status: (additionalData.status || 'pending') as any,
      data: aggregate.data,
      sentAt: additionalData.sentAt,
      deliveredAt: additionalData.deliveredAt,
      errorMessage: additionalData.errorMessage,
      errorCode: additionalData.errorCode,
      retryCount: additionalData.retryCount || 0,
      deliveryId: additionalData.deliveryId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Map user notification document to plain object
   */
  static userNotificationToPlainObject(document: any): any {
    return {
      id: document.id,
      userId: document.userId,
      notificationId: document.notificationId,
      title: document.title,
      body: document.body,
      type: document.type,
      channel: document.channel,
      priority: document.priority,
      status: document.status,
      data: document.data,
      sentAt: document.sentAt,
      deliveredAt: document.deliveredAt,
      errorMessage: document.errorMessage,
      errorCode: document.errorCode,
      retryCount: document.retryCount,
      deliveryId: document.deliveryId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * Map multiple documents to domain aggregates
   */
  static toDomainList(documents: any[]): NotificationAggregate[] {
    return documents.map((doc) => this.toDomain(doc));
  }

  /**
   * Map multiple domain aggregates to documents
   */
  static toDocumentList(aggregates: NotificationAggregate[]): Partial<Notification>[] {
    return aggregates.map((aggregate) => this.toDocument(aggregate));
  }
}
