import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  NotFoundException,
  BadRequestException,
  Injectable,
  ForbiddenException,
  Delete,
  Logger,
  Inject,
} from '@nestjs/common';
import { DeviceToken } from '../../domain/device-token.entity';
import { DeviceTokenRepository } from '../../domain/device-token.repository';
import { NovuSubscriberSyncService } from '../services/novu-subscriber-sync.service';
import { DeleteTokenCommand } from './delete-token.command';

@Injectable()
@CommandHandler(DeleteTokenCommand)
export class DeleteTokenHandler implements ICommandHandler<DeleteTokenCommand> {
  private readonly logger = new Logger(DeleteTokenHandler.name);

  constructor(
    @Inject('DeviceTokenRepository')
    private readonly deviceTokenRepository: DeviceTokenRepository,
    private readonly novuSyncService: NovuSubscriberSyncService,
  ) {}

  async execute(command: DeleteTokenCommand): Promise<void> {
    const { id, userId } = command;

    this.logger.log(`Deleting device token ${id} for user ${userId}`);

    // Find existing token
    const existingToken = await this.deviceTokenRepository.findById(id);
    if (!existingToken) {
      this.logger.warn(`Device token ${id} not found`);
      throw new NotFoundException('Device token not found');
    }

    // Check ownership
    if (!existingToken.canBeUpdatedBy(userId)) {
      this.logger.warn(
        `User ${userId} attempted to delete token ${id} owned by ${existingToken.userId}`,
      );
      throw new ForbiddenException('You can only delete your own device tokens');
    }

    try {
      // Sync with Novu subscriber before deletion (async, don't wait for completion)
      this.novuSyncService.syncSubscriberOnTokenDeletion(existingToken).catch((error) => {
        this.logger.error(
          `Failed to sync with Novu for token deletion ${existingToken.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

      // Soft delete the token
      await this.deviceTokenRepository.softDelete(id);

      this.logger.log(`Successfully deleted device token ${id} for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete device token ${id} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
