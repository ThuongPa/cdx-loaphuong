import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserStatisticsQuery } from './get-user-statistics.query';
import { Get, Query, Logger, Inject } from '@nestjs/common';
import { NotificationRepository } from '../../domain/notification.repository';

@QueryHandler(GetUserStatisticsQuery)
export class GetUserStatisticsHandler implements IQueryHandler<GetUserStatisticsQuery> {
  private readonly logger = new Logger(GetUserStatisticsHandler.name);

  constructor(
    @Inject('NotificationRepository')
    private readonly repository: NotificationRepository,
  ) {}

  async execute(query: GetUserStatisticsQuery): Promise<any> {
    const { userId, startDate, endDate } = query;
    this.logger.log(`Getting statistics for user ${userId}`);
    return this.repository.getUserStatistics(userId, { startDate, endDate });
  }
}
