import { IsString, IsOptional, IsObject, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BaseEventDto {
  @IsString()
  eventId: string;

  @IsString()
  eventType: string;

  @IsString()
  aggregateId: string;

  @IsString()
  aggregateType: string;

  @IsDateString()
  timestamp: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class EventMessageDto {
  @ValidateNested()
  @Type(() => BaseEventDto)
  event: BaseEventDto;

  @IsOptional()
  @IsString()
  routingKey?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
