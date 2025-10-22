import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, IsEnum, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class ManualRetryDto {
  @ApiProperty({ description: 'Failed notification IDs to retry', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  notificationIds: string[];

  @ApiProperty({
    description: 'Retry strategy',
    enum: ['immediate', 'scheduled', 'exponential'],
    default: 'immediate',
  })
  @IsOptional()
  @IsEnum(['immediate', 'scheduled', 'exponential'])
  strategy?: string = 'immediate';

  @ApiProperty({ description: 'Maximum retry attempts', required: false })
  @IsOptional()
  @Type(() => Number)
  maxRetries?: number;

  @ApiProperty({ description: 'Retry delay in milliseconds', required: false })
  @IsOptional()
  @Type(() => Number)
  delayMs?: number;

  @ApiProperty({ description: 'Additional retry context', required: false })
  @IsOptional()
  context?: Record<string, any>;
}

export class ManualRetryResponseDto {
  @ApiProperty({ description: 'Total notifications processed' })
  totalProcessed: number;

  @ApiProperty({ description: 'Successfully queued for retry' })
  queuedCount: number;

  @ApiProperty({ description: 'Failed to queue' })
  failedCount: number;

  @ApiProperty({ description: 'Retry batch ID' })
  batchId: string;

  @ApiProperty({ description: 'Estimated completion time' })
  estimatedCompletionTime: string;

  @ApiProperty({ description: 'Retry status' })
  status: string;
}
