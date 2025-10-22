import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum StatisticsPeriod {
  TODAY = 'today',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
  CUSTOM = 'custom',
}

export class NotificationStatisticsQueryDto {
  @ApiProperty({
    description: 'Statistics period',
    enum: StatisticsPeriod,
    required: false,
    default: StatisticsPeriod.TODAY,
  })
  @IsOptional()
  @IsEnum(StatisticsPeriod)
  period?: StatisticsPeriod = StatisticsPeriod.TODAY;

  @ApiProperty({
    description: 'Start date for custom period',
    required: false,
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for custom period',
    required: false,
    example: '2025-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class NotificationStatisticsDataDto {
  @ApiProperty({ description: 'Total notifications sent' })
  totalSent: number;

  @ApiProperty({ description: 'Total notifications today' })
  todaySent: number;

  @ApiProperty({ description: 'Total notifications this week' })
  thisWeekSent: number;

  @ApiProperty({ description: 'Total notifications this month' })
  thisMonthSent: number;

  @ApiProperty({ description: 'Breakdown by channel' })
  byChannel: {
    push: number;
    email: number;
    inApp: number;
  };

  @ApiProperty({ description: 'Breakdown by status' })
  byStatus: {
    sent: number;
    failed: number;
    pending: number;
  };

  @ApiProperty({ description: 'Delivery rate percentage' })
  deliveryRate: number;

  @ApiProperty({ description: 'Top notification types' })
  topTypes: Array<{
    type: string;
    count: number;
  }>;

  @ApiProperty({ description: 'Failed notification reasons' })
  failureReasons: Array<{
    reason: string;
    count: number;
  }>;
}

export class NotificationStatisticsResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Statistics data' })
  data: NotificationStatisticsDataDto;

  @ApiProperty({ description: 'Response message' })
  message: string;
}
