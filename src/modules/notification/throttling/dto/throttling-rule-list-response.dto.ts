import { IsArray, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ThrottlingRuleResponseDto } from './throttling-rule-response.dto';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { Res } from '@nestjs/common';

export class ThrottlingRuleListResponseDto extends PaginationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThrottlingRuleResponseDto)
  rules: ThrottlingRuleResponseDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
