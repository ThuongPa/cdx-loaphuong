import { Type } from 'class-transformer';
import { UserLimitsDto, UserBehaviorDto, UserRestrictionsDto } from './create-user-profile.dto';
import { Res } from '@nestjs/common';
import {
  IsString,
  IsObject,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';

export class UserProfileResponseDto {
  @IsString()
  id: string;

  @IsString()
  userId: string;

  @ValidateNested()
  @Type(() => UserLimitsDto)
  limits: UserLimitsDto;

  @ValidateNested()
  @Type(() => UserBehaviorDto)
  behavior: UserBehaviorDto;

  @ValidateNested()
  @Type(() => UserRestrictionsDto)
  restrictions: UserRestrictionsDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}
