import { PartialType } from '@nestjs/swagger';
import { CreateThrottlingRuleDto } from './create-throttling-rule.dto';

export class UpdateThrottlingRuleDto extends PartialType(CreateThrottlingRuleDto) {}
