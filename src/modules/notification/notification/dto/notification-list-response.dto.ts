import { IsArray, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationResponseDto } from './notification-response.dto';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { Res } from '@nestjs/common';

export class NotificationListResponseDto extends PaginationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationResponseDto)
  notifications: NotificationResponseDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
