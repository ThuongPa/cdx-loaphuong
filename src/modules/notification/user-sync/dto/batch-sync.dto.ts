import { IsString, IsArray, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserDataDto } from './sync-user.dto';

export class BatchSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserDataDto)
  users: UserDataDto[];

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
