export class GetNotificationQuery {
  notificationId: string;
  userId: string;
}

export interface NotificationDetail {
  id: string;
  userId: string;
  notificationId: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  priority: string;
  status: string;
  data: Record<string, any>;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  retryCount?: number;
  deliveryId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
