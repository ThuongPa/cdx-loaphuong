import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSync } from '../domain/user-sync.entity';
import { UserSyncRepository } from './user-sync.repository';
import { UserSyncFilters } from '../application/services/user-sync.service';
import { UserSyncDocument, UserSyncSchema } from '../user-sync.schema';

@Injectable()
export class UserSyncRepositoryImpl implements UserSyncRepository {
  constructor(@InjectModel('UserSync') private userSyncModel: Model<UserSyncDocument>) {}

  async create(userSync: UserSync): Promise<UserSync> {
    const userSyncData = userSync.toPersistence();
    const created = await this.userSyncModel.create(userSyncData);
    return UserSync.fromPersistence(created);
  }

  async findById(id: string): Promise<UserSync | null> {
    const userSync = await this.userSyncModel.findById(id).exec();
    return userSync ? UserSync.fromPersistence(userSync) : null;
  }

  async findByUserId(userId: string): Promise<UserSync[]> {
    const userSyncs = await this.userSyncModel.find({ userId }).exec();
    return userSyncs.map((userSync) => UserSync.fromPersistence(userSync));
  }

  async update(id: string, userSync: UserSync): Promise<UserSync> {
    const userSyncData = userSync.toPersistence();
    const updated = await this.userSyncModel
      .findByIdAndUpdate(id, userSyncData, { new: true })
      .exec();
    return updated ? UserSync.fromPersistence(updated) : userSync;
  }

  async delete(id: string): Promise<void> {
    await this.userSyncModel.findByIdAndDelete(id).exec();
  }

  async find(filters: UserSyncFilters): Promise<UserSync[]> {
    const query: any = {};

    if (filters.userIds && filters.userIds.length > 0) {
      query.userId = { $in: filters.userIds };
    }

    if (filters.types && filters.types.length > 0) {
      query.type = { $in: filters.types };
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query.status = { $in: filters.statuses };
    }

    if (filters.sources && filters.sources.length > 0) {
      query.source = { $in: filters.sources };
    }

    if (filters.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end,
      };
    }

    const userSyncs = await this.userSyncModel
      .find(query)
      .limit(filters.limit || 100)
      .skip(filters.offset || 0)
      .sort({ createdAt: -1 })
      .exec();

    return userSyncs.map((userSync) => UserSync.fromPersistence(userSync));
  }

  async findByStatus(status: string): Promise<UserSync[]> {
    const userSyncs = await this.userSyncModel.find({ status }).exec();
    return userSyncs.map((userSync) => UserSync.fromPersistence(userSync));
  }

  async findFailedForRetry(): Promise<UserSync[]> {
    const userSyncs = await this.userSyncModel
      .find({
        status: 'failed',
        retryCount: { $lt: 3 },
      })
      .exec();

    return userSyncs.map((userSync) => UserSync.fromPersistence(userSync));
  }

  async bulkUpdateStatus(ids: string[], status: string, errorMessage?: string): Promise<void> {
    const updateData: any = { status };
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.userSyncModel.updateMany({ _id: { $in: ids } }, updateData).exec();
  }

  async cleanupOldSyncs(cutoffDate: Date): Promise<number> {
    const result = await this.userSyncModel
      .deleteMany({
        status: 'completed',
        completedAt: { $lt: cutoffDate },
      })
      .exec();

    return result.deletedCount || 0;
  }
}
