import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class UserLimitsDto {
  @IsNumber()
  dailyLimit: number;

  @IsNumber()
  hourlyLimit: number;

  @IsNumber()
  burstLimit: number;

  @IsNumber()
  @IsOptional()
  weeklyLimit?: number;

  @IsNumber()
  @IsOptional()
  monthlyLimit?: number;
}

export class UserBehaviorDto {
  @IsString()
  pattern: string;

  @IsNumber()
  frequency: number;

  @IsObject()
  @IsOptional()
  preferences?: Record<string, any>;
}

export class UserRestrictionsDto {
  @IsBoolean()
  isBlocked: boolean;

  @IsArray()
  @IsString({ each: true })
  blockedChannels: string[];

  @IsArray()
  @IsString({ each: true })
  blockedTypes: string[];

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateUserProfileDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @ValidateNested()
  @Type(() => UserLimitsDto)
  limits: UserLimitsDto;

  @ValidateNested()
  @Type(() => UserBehaviorDto)
  behavior: UserBehaviorDto;

  @ValidateNested()
  @Type(() => UserRestrictionsDto)
  restrictions: UserRestrictionsDto;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
