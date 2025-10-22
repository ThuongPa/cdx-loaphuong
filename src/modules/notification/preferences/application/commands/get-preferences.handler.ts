import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetPreferencesQuery } from './get-preferences.query';
import { UserPreferencesRepository } from '../../domain/user-preferences.repository';
import { UserPreferences } from '../../domain/user-preferences.entity';

@Injectable()
@QueryHandler(GetPreferencesQuery)
export class GetPreferencesHandler implements IQueryHandler<GetPreferencesQuery> {
  constructor(
    @Inject('UserPreferencesRepository')
    private readonly userPreferencesRepository: UserPreferencesRepository,
  ) {}

  async execute(query: GetPreferencesQuery): Promise<UserPreferences> {
    const { userId } = query;

    let preferences = await this.userPreferencesRepository.findByUserId(userId);

    if (!preferences) {
      preferences = await this.userPreferencesRepository.createDefault(userId);
    }

    return preferences;
  }
}
