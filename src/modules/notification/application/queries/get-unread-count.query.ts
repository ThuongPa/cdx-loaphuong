import { IQuery } from '@nestjs/cqrs';
import { Get, Query } from '@nestjs/common';

export class GetUnreadCountQuery implements IQuery {
  constructor(public readonly userId: string) {}
}