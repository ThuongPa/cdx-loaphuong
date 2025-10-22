import { IsString, IsArray, IsOptional, IsObject, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateNotificationDto } from './create-notification.dto';
import { BatchOperationDto } from '../../../../common/dto/batch-operation.dto';

export enum BulkAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MARK_READ = 'mark_read',
  MARK_UNREAD = 'mark_unread',
  SEND = 'send',
  CANCEL = 'cancel',
}

export class BulkNotificationDto {
  @IsEnum(BulkAction)
  action: BulkAction;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationDto)
  notifications: CreateNotificationDto[];

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
