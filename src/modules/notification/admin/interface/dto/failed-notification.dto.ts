import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FailedNotificationQueryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Start date filter',
    example: '2025-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date filter',
    example: '2025-01-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Error type filter',
    example: 'INVALID_TOKEN',
    required: false,
  })
  @IsOptional()
  @IsString()
  errorType?: string;

  @ApiProperty({
    description: 'Notification type filter',
    example: 'announcement',
    required: false,
  })
  @IsOptional()
  @IsString()
  notificationType?: string;
}

export class FailedNotificationItemDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User email' })
  userEmail: string;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification type' })
  type: string;

  @ApiProperty({ description: 'Notification channel' })
  channel: string;

  @ApiProperty({ description: 'Error message' })
  errorMessage: string;

  @ApiProperty({ description: 'Error code' })
  errorCode: string;

  @ApiProperty({ description: 'Retry count' })
  retryCount: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last attempt at' })
  lastAttemptAt: Date;
}

export class FailedNotificationResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Failed notifications' })
  data: FailedNotificationItemDto[];

  @ApiProperty({ description: 'Pagination info' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({ description: 'Response message' })
  message: string;
}

export class ManualRetryDto {
  @ApiProperty({
    description: 'Retry reason',
    example: 'Token was refreshed',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ManualRetryResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Retry ID' })
  retryId: string;

  @ApiProperty({ description: 'Response message' })
  message: string;
}
