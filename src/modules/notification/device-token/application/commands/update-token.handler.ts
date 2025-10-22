import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  NotFoundException,
  BadRequestException,
  Injectable,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { DeviceToken } from '../../domain/device-token.entity';
import { DeviceTokenRepository } from '../../domain/device-token.repository';
import { NovuSubscriberSyncService } from '../services/novu-subscriber-sync.service';
import { UpdateTokenCommand } from './update-token.command';

@Injectable()
@CommandHandler(UpdateTokenCommand)
export class UpdateTokenHandler implements ICommandHandler<UpdateTokenCommand> {
  private readonly logger = new Logger(UpdateTokenHandler.name);

  constructor(
    @Inject('DeviceTokenRepository')
    private readonly deviceTokenRepository: DeviceTokenRepository,
    private readonly novuSyncService: NovuSubscriberSyncService,
  ) {}

  async execute(command: UpdateTokenCommand): Promise<DeviceToken> {
    const { id, userId, token, isActive } = command;

    this.logger.log(`Updating device token ${id} for user ${userId}`);

    // Find existing token
    const existingToken = await this.deviceTokenRepository.findById(id);
    if (!existingToken) {
      this.logger.warn(`Device token ${id} not found`);
      throw new NotFoundException('Device token not found');
    }

    // Check ownership
    if (!existingToken.canBeUpdatedBy(userId)) {
      this.logger.warn(
        `User ${userId} attempted to update token ${id} owned by ${existingToken.userId}`,
      );
      throw new ForbiddenException('You can only update your own device tokens');
    }

    try {
      // Update token if provided
      if (token !== undefined) {
        existingToken.updateToken(token);
      }

      // Update active status if provided
      if (isActive !== undefined) {
        if (isActive) {
          existingToken.markAsActive();
        } else {
          existingToken.markAsInactive();
        }
      }

      // Save updated token
      const updatedToken = await this.deviceTokenRepository.save(existingToken);

      // Sync with Novu subscriber (async, don't wait for completion)
      this.novuSyncService.syncSubscriberOnTokenUpdate(updatedToken).catch((error) => {
        this.logger.error(
          `Failed to sync with Novu for token update ${updatedToken.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

      this.logger.log(`Successfully updated device token ${id} for user ${userId}`);
      return updatedToken;
    } catch (error) {
      this.logger.error(
        `Failed to update device token ${id} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
