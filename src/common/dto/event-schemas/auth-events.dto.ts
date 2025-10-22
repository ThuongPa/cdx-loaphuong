import { IsString, IsOptional, IsArray, IsObject, IsBoolean } from 'class-validator';

export class UserRoleChangedEventPayload {
  @IsString()
  userId: string;

  @IsArray()
  @IsString({ each: true })
  previousRoles: string[];

  @IsArray()
  @IsString({ each: true })
  newRoles: string[];

  @IsString()
  changedBy: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UserUpdatedEventPayload {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  updatedBy: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UserCreatedEventPayload {
  @IsString()
  userId: string;

  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsArray()
  @IsString({ each: true })
  roles: string[];

  @IsString()
  createdBy: string;
}
