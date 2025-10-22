import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserPreferencesRepository } from '../domain/user-preferences.repository';
import { UserPreferences } from '../domain/user-preferences.entity';
import {
  UserPreferencesDocument,
  UserPreferencesSchema,
} from '../../../../infrastructure/database/schemas/user-preferences.schema';

@Injectable()
export class UserPreferencesRepositoryImpl implements UserPreferencesRepository {
  constructor(
    @InjectModel('UserPreferences')
    private readonly userPreferencesModel: Model<UserPreferencesDocument>,
  ) {}

  async findByUserId(userId: string): Promise<UserPreferences | null> {
    const doc = await this.userPreferencesModel.findOne({ userId }).exec();
    if (!doc) {
      return null;
    }
    return this.toEntity(doc);
  }

  async save(preferences: UserPreferences): Promise<UserPreferences> {
    const doc = await this.userPreferencesModel
      .findOneAndUpdate(
        { userId: preferences.userId },
        {
          userId: preferences.userId,
          channelPreferences: preferences.channelPreferences,
          typePreferences: preferences.typePreferences,
          quietHours: preferences.quietHours,
          updatedAt: new Date(),
        },
        { upsert: true, new: true, runValidators: true },
      )
      .exec();

    return this.toEntity(doc);
  }

  async createDefault(userId: string): Promise<UserPreferences> {
    const defaultPrefs = UserPreferences.createDefault(userId);
    return this.save(defaultPrefs);
  }

  async delete(userId: string): Promise<void> {
    await this.userPreferencesModel.deleteOne({ userId }).exec();
  }

  private toEntity(doc: UserPreferencesDocument): UserPreferences {
    return new UserPreferences(
      (doc._id as any).toString(),
      doc.userId,
      doc.channelPreferences,
      doc.typePreferences,
      doc.quietHours,
      (doc as any).createdAt || new Date(),
      (doc as any).updatedAt || new Date(),
    );
  }
}
