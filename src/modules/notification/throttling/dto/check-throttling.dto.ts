import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class CheckThrottlingDto {
  @IsString()
  userId: string;

  @IsString()
  notificationType: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  channel?: string;
}
