import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePreferencesCommand } from './update-preferences.command';
import { UserPreferencesRepository } from '../../domain/user-preferences.repository';
import { UserPreferences } from '../../domain/user-preferences.entity';

@Injectable()
@CommandHandler(UpdatePreferencesCommand)
export class UpdatePreferencesHandler implements ICommandHandler<UpdatePreferencesCommand> {
  constructor(
    @Inject('UserPreferencesRepository')
    private readonly userPreferencesRepository: UserPreferencesRepository,
  ) {}

  async execute(command: UpdatePreferencesCommand): Promise<UserPreferences> {
    const { userId, channels, types, quietHours } = command;

    // Validate emergency cannot be disabled
    if (types?.emergency === false) {
      throw new BadRequestException('Emergency notifications cannot be disabled');
    }

    // Get existing preferences or create default ones
    let preferences = await this.userPreferencesRepository.findByUserId(userId);

    if (!preferences) {
      preferences = await this.userPreferencesRepository.createDefault(userId);
    }

    // Update preferences
    let updatedPreferences = preferences;

    if (channels) {
      updatedPreferences = updatedPreferences.updateChannelPreferences(channels);
    }

    if (types) {
      updatedPreferences = updatedPreferences.updateTypePreferences(types);
    }

    if (quietHours) {
      updatedPreferences = updatedPreferences.updateQuietHours(quietHours);
    }

    // Save updated preferences
    return await this.userPreferencesRepository.save(updatedPreferences);
  }
}
