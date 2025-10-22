import { PartialType } from '@nestjs/mapped-types';
import { CreateTemplateVersionDto } from './create-template-version.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTemplateVersionDto extends PartialType(CreateTemplateVersionDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
