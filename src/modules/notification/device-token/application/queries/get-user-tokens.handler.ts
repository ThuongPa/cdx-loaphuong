import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { DeviceToken } from '../../domain/device-token.entity';
import { DeviceTokenRepository } from '../../domain/device-token.repository';
import { GetUserTokensQuery } from './get-user-tokens.query';
import { Injectable, Get, Query, Logger, Inject } from '@nestjs/common';

@Injectable()
@QueryHandler(GetUserTokensQuery)
export class GetUserTokensHandler implements IQueryHandler<GetUserTokensQuery> {
  private readonly logger = new Logger(GetUserTokensHandler.name);

  constructor(
    @Inject('DeviceTokenRepository')
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  async execute(query: GetUserTokensQuery): Promise<DeviceToken[]> {
    const { userId } = query;

    this.logger.log(`Getting device tokens for user ${userId}`);

    try {
      const tokens = await this.deviceTokenRepository.findByUserId(userId);

      this.logger.log(`Found ${tokens.length} device tokens for user ${userId}`);
      return tokens;
    } catch (error) {
      this.logger.error(
        `Failed to get device tokens for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
