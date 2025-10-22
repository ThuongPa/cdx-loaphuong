import { IsString, IsEnum, IsObject, IsOptional, IsDateString, IsArray } from 'class-validator';
import { WebhookEventType } from '../webhook.types';
import { Type } from 'class-transformer';

export class WebhookEventDto {
  @IsString()
  id: string;

  @IsString()
  webhookId: string;

  @IsEnum(WebhookEventType)
  eventType: WebhookEventType;

  @IsString()
  eventId: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  timestamp: string;
}
