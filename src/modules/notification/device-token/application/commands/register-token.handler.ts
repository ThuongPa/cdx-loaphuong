import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeviceToken } from '../../domain/device-token.entity';
import { DeviceTokenRepository } from '../../domain/device-token.repository';
import { NovuSubscriberSyncService } from '../services/novu-subscriber-sync.service';
import { RegisterTokenCommand } from './register-token.command';
import { Injectable, Logger, ConflictException, Inject } from '@nestjs/common';

@Injectable()
@CommandHandler(RegisterTokenCommand)
export class RegisterTokenHandler implements ICommandHandler<RegisterTokenCommand> {
  private readonly logger = new Logger(RegisterTokenHandler.name);

  constructor(
    @Inject('DeviceTokenRepository')
    private readonly deviceTokenRepository: DeviceTokenRepository,
    private readonly novuSyncService: NovuSubscriberSyncService,
  ) {}

  async execute(command: RegisterTokenCommand): Promise<DeviceToken> {
    const { userId, token, platform, provider, deviceId, deviceName, osVersion, appVersion } =
      command;

    this.logger.log(`Registering device token for user ${userId}, device ${deviceId}`);

    // Check if token already exists for this user, platform, and device
    const existingToken = await this.deviceTokenRepository.findByUserAndDevice(userId, deviceId);
    if (existingToken) {
      this.logger.warn(`Token already exists for user ${userId}, device ${deviceId}`);
      throw new ConflictException('Device token already exists for this device');
    }

    // Check if token string is already in use by another user
    const tokenInUse = await this.deviceTokenRepository.findByToken(token);
    if (tokenInUse && tokenInUse.userId !== userId) {
      this.logger.warn(`Token already in use by another user: ${tokenInUse.userId}`);
      throw new ConflictException('Device token is already in use');
    }

    try {
      // Create new device token
      const deviceToken = DeviceToken.createFromRaw({
        userId,
        token,
        platform,
        provider,
        deviceId,
        channel: 'push', // Default channel for device tokens
        isActive: true,
      });

      // Save to repository
      const savedToken = await this.deviceTokenRepository.save(deviceToken);

      // Sync with Novu subscriber (async, don't wait for completion)
      this.novuSyncService.syncSubscriberOnTokenRegistration(savedToken).catch((error) => {
        this.logger.error(
          `Failed to sync with Novu for token ${savedToken.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

      this.logger.log(`Successfully registered device token ${savedToken.id} for user ${userId}`);
      return savedToken;
    } catch (error) {
      this.logger.error(
        `Failed to register device token for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
