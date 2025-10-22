import { ApiProperty } from '@nestjs/swagger';

export class NotificationDetailDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Original notification ID' })
  notificationId: string;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification body' })
  body: string;

  @ApiProperty({ description: 'Notification type' })
  type: string;

  @ApiProperty({ description: 'Notification channel' })
  channel: string;

  @ApiProperty({ description: 'Notification priority' })
  priority: string;

  @ApiProperty({ description: 'Notification status' })
  status: string;

  @ApiProperty({ description: 'Additional notification data' })
  data: Record<string, any>;

  @ApiProperty({ description: 'When notification was sent', required: false })
  sentAt?: Date;

  @ApiProperty({ description: 'When notification was delivered', required: false })
  deliveredAt?: Date;

  @ApiProperty({ description: 'When notification was read', required: false })
  readAt?: Date;

  @ApiProperty({ description: 'Error message if failed', required: false })
  errorMessage?: string;

  @ApiProperty({ description: 'Error code if failed', required: false })
  errorCode?: string;

  @ApiProperty({ description: 'Retry count', required: false })
  retryCount?: number;

  @ApiProperty({ description: 'Delivery ID from provider', required: false })
  deliveryId?: string;

  @ApiProperty({ description: 'When notification was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When notification was last updated' })
  updatedAt: Date;
}
