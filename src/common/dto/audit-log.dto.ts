import { IsString, IsEnum, IsOptional, IsObject, IsDateString, IsNumber } from 'class-validator';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
}

export enum AuditLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

export class AuditLogDto {
  @IsString()
  id: string;

  @IsString()
  userId: string;

  @IsEnum(AuditAction)
  action: AuditAction;

  @IsString()
  resource: string;

  @IsString()
  resourceId: string;

  @IsEnum(AuditLevel)
  level: AuditLevel;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  oldValues?: Record<string, any>;

  @IsOptional()
  @IsObject()
  newValues?: Record<string, any>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  timestamp: string;

  @IsNumber()
  duration?: number;
}
