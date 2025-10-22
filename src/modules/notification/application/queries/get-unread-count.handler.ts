import { Injectable, Logger, Get, Query } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUnreadCountQuery } from './get-unread-count.query';

@Injectable()
@QueryHandler(GetUnreadCountQuery)
export class GetUnreadCountHandler implements IQueryHandler<GetUnreadCountQuery> {
  private readonly logger = new Logger(GetUnreadCountHandler.name);

  async execute(query: GetUnreadCountQuery): Promise<number> {
    try {
      this.logger.log('Getting unread count', { userId: query.userId });
      
      // Implementation to get unread count
      // This would typically query the database
      const unreadCount = 0; // Placeholder
      
      this.logger.log('Unread count retrieved', { 
        userId: query.userId, 
        count: unreadCount 
      });

      return unreadCount;
    } catch (error) {
      this.logger.error('Failed to get unread count', error);
      throw error;
    }
  }
}