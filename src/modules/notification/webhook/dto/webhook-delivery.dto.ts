import { IsString, IsOptional, IsObject, IsDateString, IsNumber, IsBoolean } from 'class-validator';

export class WebhookDeliveryDto {
  @IsString()
  webhookId: string;

  @IsString()
  eventType: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  responseCode?: number;

  @IsOptional()
  @IsString()
  responseBody?: string;

  @IsOptional()
  @IsDateString()
  deliveredAt?: string;

  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @IsOptional()
  @IsBoolean()
  isSuccessful?: boolean;
}
