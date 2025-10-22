import {
  ChannelPreferences,
  TypePreferences,
  QuietHours,
} from '../../domain/user-preferences.entity';

export class UpdatePreferencesCommand {
  constructor(
    public readonly userId: string,
    public readonly channels?: Partial<ChannelPreferences>,
    public readonly types?: Partial<TypePreferences>,
    public readonly quietHours?: Partial<QuietHours>,
  ) {}
}
