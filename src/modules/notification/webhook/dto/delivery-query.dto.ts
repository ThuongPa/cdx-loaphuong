import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeliveryFilters {
  @IsOptional()
  @IsString()
  webhookId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsBoolean()
  isSuccessful?: boolean;

  @IsOptional()
  @IsDateString()
  deliveredAtFrom?: string;

  @IsOptional()
  @IsDateString()
  deliveredAtTo?: string;
}

export class DeliverySortOptions {
  @IsOptional()
  @IsString()
  sortBy?: string = 'deliveredAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class DeliveryPaginationOptions {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

export class DeliveryQueryResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
