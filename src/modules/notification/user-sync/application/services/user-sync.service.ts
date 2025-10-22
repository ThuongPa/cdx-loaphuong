import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { UserSync } from '../../domain/user-sync.entity';
import { UserSyncRepository } from '../../infrastructure/user-sync.repository';

export interface CreateUserSyncDto {
  userId: string;
  type:
    | 'user_update'
    | 'preferences_update'
    | 'device_update'
    | 'user_delete'
    | 'full_sync'
    | 'incremental_sync'
    | 'realtime_sync';
  source: 'api' | 'webhook' | 'manual' | 'auth_service' | 'novu' | 'external_api';
  data?: Record<string, any>;
  reason?: string;
  priority?: number;
  isScheduled?: boolean;
  scheduledAt?: Date;
  maxRetries?: number;
}

export interface UpdateUserSyncDto {
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  data?: Record<string, any>;
  reason?: string;
  priority?: number;
  isScheduled?: boolean;
  scheduledAt?: Date;
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
}

export interface UserSyncFilters {
  userIds?: string[];
  types?: string[];
  statuses?: string[];
  sources?: string[];
  dateRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
}

@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);

  constructor(
    @Inject('UserSyncRepository') private readonly userSyncRepository: UserSyncRepository,
  ) {}

  async createUserSync(createDto: CreateUserSyncDto): Promise<UserSync> {
    this.logger.log(`Creating user sync for user ${createDto.userId}`);

    if (!createDto.userId) {
      throw new BadRequestException('User ID is required');
    }

    if (!createDto.type) {
      throw new BadRequestException('Sync type is required');
    }

    if (!createDto.source) {
      throw new BadRequestException('Sync source is required');
    }

    const userSync = UserSync.create({
      userId: createDto.userId,
      type: createDto.type,
      source: createDto.source,
      status: 'pending',
      data: createDto.data,
      reason: createDto.reason,
      priority: createDto.priority || 1,
      isScheduled: createDto.isScheduled || false,
      scheduledAt: createDto.scheduledAt,
      errorMessage: undefined,
      retryCount: 0,
      maxRetries: createDto.maxRetries || 3,
    });

    return this.userSyncRepository.create(userSync);
  }

  async getUserSyncById(id: string): Promise<UserSync> {
    const userSync = await this.userSyncRepository.findById(id);
    if (!userSync) {
      throw new NotFoundException(`User sync with ID ${id} not found`);
    }
    return userSync;
  }

  async getUserSyncsByUserId(userId: string): Promise<UserSync[]> {
    return this.userSyncRepository.findByUserId(userId);
  }

  async updateUserSync(id: string, updateDto: UpdateUserSyncDto): Promise<UserSync> {
    this.logger.log(`Updating user sync ${id}`);

    const userSync = await this.getUserSyncById(id);

    if (updateDto.status) {
      userSync.updateStatus(updateDto.status, updateDto.errorMessage);
    }

    if (updateDto.retryCount !== undefined) {
      userSync.incrementRetryCount();
    }

    return this.userSyncRepository.update(id, userSync);
  }

  async deleteUserSync(id: string): Promise<void> {
    this.logger.log(`Deleting user sync ${id}`);

    const userSync = await this.getUserSyncById(id);
    await this.userSyncRepository.delete(id);
  }

  async findUserSyncs(filters: UserSyncFilters): Promise<UserSync[]> {
    return this.userSyncRepository.find(filters);
  }

  async executeUserSync(id: string): Promise<UserSync> {
    this.logger.log(`Executing user sync ${id}`);

    const userSync = await this.getUserSyncById(id);

    if (userSync.status !== 'pending') {
      throw new BadRequestException(`User sync ${id} is not in pending status`);
    }

    // Update status to in progress
    userSync.updateStatus('in_progress');
    await this.userSyncRepository.update(id, userSync);

    try {
      // Simulate sync execution
      await this.performSync(userSync);

      // Update status to completed
      userSync.updateStatus('completed');
      await this.userSyncRepository.update(id, userSync);

      this.logger.log(`User sync ${id} completed successfully`);
      return userSync;
    } catch (error) {
      // Update status to failed
      userSync.updateStatus('failed', error.message);
      await this.userSyncRepository.update(id, userSync);

      this.logger.error(`User sync ${id} failed: ${error.message}`);
      throw error;
    }
  }

  async retryUserSync(id: string): Promise<UserSync> {
    this.logger.log(`Retrying user sync ${id}`);

    const userSync = await this.getUserSyncById(id);

    if (userSync.status !== 'failed') {
      throw new BadRequestException(`User sync ${id} is not in failed status`);
    }

    if (!userSync.canRetry()) {
      throw new BadRequestException(`User sync ${id} has exceeded maximum retry attempts`);
    }

    userSync.incrementRetryCount();
    userSync.updateStatus('pending');
    await this.userSyncRepository.update(id, userSync);

    return this.executeUserSync(id);
  }

  async getUserSyncsByStatus(status: string): Promise<UserSync[]> {
    return this.userSyncRepository.findByStatus(status);
  }

  async getFailedSyncsForRetry(): Promise<UserSync[]> {
    return this.userSyncRepository.findFailedForRetry();
  }

  async bulkUpdateUserSyncStatus(
    ids: string[],
    status: string,
    errorMessage?: string,
  ): Promise<{ successCount: number; errorCount: number }> {
    this.logger.log(`Bulk updating ${ids.length} syncs to status ${status}`);

    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
      try {
        const userSync = await this.getUserSyncById(id);
        userSync.updateStatus(status, errorMessage);
        await this.userSyncRepository.update(id, userSync);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to update sync ${id}: ${error.message}`);
        errorCount++;
      }
    }

    return { successCount, errorCount };
  }

  async getSyncStatistics(dateRange?: { start: Date; end: Date }): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const filters: UserSyncFilters = {};
    if (dateRange) {
      filters.dateRange = dateRange;
    }

    const syncs = await this.userSyncRepository.find(filters);

    return {
      total: syncs.length,
      pending: syncs.filter((s) => s.status === 'pending').length,
      inProgress: syncs.filter((s) => s.status === 'in_progress').length,
      completed: syncs.filter((s) => s.status === 'completed').length,
      failed: syncs.filter((s) => s.status === 'failed').length,
      cancelled: syncs.filter((s) => s.status === 'cancelled').length,
    };
  }

  async cleanupOldSyncs(daysOld: number = 30): Promise<number> {
    this.logger.log(`Cleaning up syncs older than ${daysOld} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.userSyncRepository.cleanupOldSyncs(cutoffDate);
  }

  private async performSync(userSync: UserSync): Promise<void> {
    // Simulate sync operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Simulated sync failure');
    }
  }
}
