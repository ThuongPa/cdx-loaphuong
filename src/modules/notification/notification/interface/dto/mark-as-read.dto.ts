import { ApiProperty } from '@nestjs/swagger';
import { Res } from '@nestjs/common';

export class MarkAsReadResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Notification ID' })
  notificationId: string;

  @ApiProperty({ description: 'When notification was marked as read' })
  readAt: Date;
}

export class MarkAllAsReadResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Number of notifications marked as read' })
  updatedCount: number;

  @ApiProperty({ description: 'When notifications were marked as read' })
  readAt: Date;
}

export class UnreadCountResponseDto {
  @ApiProperty({ description: 'Number of unread notifications' })
  count: number;

  @ApiProperty({ description: 'When count was last updated' })
  lastUpdated: Date;
}
