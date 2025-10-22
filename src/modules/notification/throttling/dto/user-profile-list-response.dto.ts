import { IsArray, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserProfileResponseDto } from './user-profile-response.dto';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { Res } from '@nestjs/common';

export class UserProfileListResponseDto extends PaginationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserProfileResponseDto)
  profiles: UserProfileResponseDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
