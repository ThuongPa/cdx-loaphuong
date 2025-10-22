export class GetNotificationHistoryQuery {
  userId: string;
  page?: number;
  limit?: number;
  type?: string;
  channel?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'createdAt' | 'sentAt' | 'readAt';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationHistoryItem {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationHistoryResult {
  notifications: NotificationHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
