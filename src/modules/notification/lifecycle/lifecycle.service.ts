import { Cron, CronExpression } from '@nestjs/schedule';
import { LifecycleRepository } from './lifecycle.repository';
import { Injectable, Delete, Logger } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  NotificationLifecycle,
  LifecyclePolicy,
  LifecycleExecution,
  DataRetentionRule,
  LifecycleStatistics,
  LifecycleStage,
  RetentionPolicy,
  ArchivalStatus,
} from './lifecycle.schema';
import { CreateLifecycleDto } from './dto/create-lifecycle.dto';
import { UpdateLifecycleDto } from './dto/update-lifecycle.dto';
import { LifecycleFilters } from './dto/lifecycle-filters.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { CreateRetentionRuleDto } from './dto/create-retention-rule.dto';

@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(private readonly lifecycleRepository: LifecycleRepository) {}

  async createLifecycle(createDto: CreateLifecycleDto): Promise<NotificationLifecycle> {
    const lifecycle = await this.lifecycleRepository.createLifecycle({
      notificationId: createDto.notificationId,
      userId: createDto.userId,
      currentStage: createDto.currentStage,
      metadata: createDto.metadata,
      policy: createDto.policy,
      archivalStatus: ArchivalStatus.ACTIVE,
    });

    this.logger.log(`Lifecycle created for notification ${createDto.notificationId}`);
    return lifecycle;
  }

  async getLifecycleById(id: string): Promise<NotificationLifecycle | null> {
    return this.lifecycleRepository.getLifecycleById(id);
  }

  async getLifecycleByNotificationId(
    notificationId: string,
  ): Promise<NotificationLifecycle | null> {
    return this.lifecycleRepository.getLifecycleByNotificationId(notificationId);
  }

  async getLifecyclesByUserId(userId: string): Promise<NotificationLifecycle[]> {
    return this.lifecycleRepository.getLifecyclesByUser(userId);
  }

  async updateLifecycle(
    id: string,
    updateDto: UpdateLifecycleDto,
  ): Promise<NotificationLifecycle | null> {
    const lifecycle = await this.lifecycleRepository.getLifecycleById(id);
    if (!lifecycle) {
      return null;
    }

    const updatedLifecycle = await this.lifecycleRepository.updateLifecycle(id, updateDto);
    this.logger.log(`Lifecycle updated for notification ${lifecycle.notificationId}`);
    return updatedLifecycle;
  }

  async transitionLifecycle(
    id: string,
    newStage: LifecycleStage,
  ): Promise<NotificationLifecycle | null> {
    const lifecycle = await this.lifecycleRepository.getLifecycleById(id);
    if (!lifecycle) {
      return null;
    }

    const updatedLifecycle = await this.lifecycleRepository.updateLifecycle(id, {
      currentStage: newStage,
    });
    this.logger.log(
      `Lifecycle transitioned from ${lifecycle.currentStage} to ${newStage} for notification ${lifecycle.notificationId}`,
    );
    return updatedLifecycle;
  }

  async getLifecyclesByStage(stage: LifecycleStage): Promise<NotificationLifecycle[]> {
    return this.lifecycleRepository.getLifecyclesByStage(stage);
  }

  async getLifecyclesByUser(userId: string): Promise<NotificationLifecycle[]> {
    return this.lifecycleRepository.getLifecyclesByUser(userId);
  }

  async findLifecycles(filters: LifecycleFilters): Promise<NotificationLifecycle[]> {
    return this.lifecycleRepository.findLifecycles(filters);
  }

  async createPolicy(createDto: CreatePolicyDto): Promise<LifecyclePolicy> {
    return this.lifecycleRepository.createPolicy(createDto);
  }

  async getPolicyById(id: string): Promise<LifecyclePolicy | null> {
    return this.lifecycleRepository.getPolicyById(id);
  }

  async getPolicyByName(name: string): Promise<LifecyclePolicy | null> {
    return this.lifecycleRepository.getPolicyByName(name);
  }

  async updatePolicy(
    id: string,
    updateData: Partial<LifecyclePolicy>,
  ): Promise<LifecyclePolicy | null> {
    return this.lifecycleRepository.updatePolicy(id, updateData);
  }

  async getActivePolicies(): Promise<LifecyclePolicy[]> {
    return this.lifecycleRepository.getActivePolicies();
  }

  async createRetentionRule(createDto: CreateRetentionRuleDto): Promise<DataRetentionRule> {
    return this.lifecycleRepository.createRetentionRule(createDto);
  }

  async getRetentionRuleById(id: string): Promise<DataRetentionRule | null> {
    return this.lifecycleRepository.getRetentionRuleById(id);
  }

  async updateRetentionRule(
    id: string,
    updateData: Partial<DataRetentionRule>,
  ): Promise<DataRetentionRule | null> {
    return this.lifecycleRepository.updateRetentionRule(id, updateData);
  }

  async getActiveRetentionRules(): Promise<DataRetentionRule[]> {
    return this.lifecycleRepository.getActiveRetentionRules();
  }

  async executePolicy(policyId: string): Promise<LifecycleExecution> {
    const policy = await this.getPolicyById(policyId);
    if (!policy) {
      throw new Error(`Policy with id ${policyId} not found`);
    }

    const execution = await this.lifecycleRepository.createExecution({
      policyId: (policy as any)._id,
      triggerType: 'manual',
      scope: {
        stages: policy.conditions?.stages,
        dateRange: policy.conditions?.timeRange,
        // userSegments: policy.conditions?.userSegments,
        // notificationTypes: policy.conditions?.notificationTypes,
      },
      status: 'pending',
      progress: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0,
      },
      executedBy: 'system',
    });

    // Execute policy logic
    await this.executePolicyLogic(policy, execution);

    return execution;
  }

  private async executePolicyLogic(
    policy: LifecyclePolicy,
    execution: LifecycleExecution,
  ): Promise<void> {
    try {
      execution.status = 'running';
      execution.startedAt = new Date();
      await this.lifecycleRepository.updateExecution((execution as any)._id, execution);

      const matchingLifecycles = await this.findLifecycles(policy.conditions || {});
      execution.progress.total = matchingLifecycles.length;

      let processed = 0;
      let successful = 0;
      let failed = 0;

      for (const lifecycle of matchingLifecycles) {
        try {
          await this.applyPolicyAction(lifecycle, policy.actions);
          successful++;
        } catch (error) {
          this.logger.error(
            `Failed to apply policy action to lifecycle ${(lifecycle as any)._id}:`,
            error,
          );
          failed++;
        }

        processed++;
        execution.progress.processed = processed;
        execution.progress.successful = successful;
        execution.progress.failed = failed;
        execution.progress.percentage = (processed / execution.progress.total) * 100;

        await this.lifecycleRepository.updateExecution((execution as any)._id, execution);
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.result = {
        notificationsProcessed: processed,
        notificationsArchived: successful,
        notificationsDeleted: 0,
        errors: [],
      };

      await this.lifecycleRepository.updateExecution((execution as any)._id, execution);
    } catch (error) {
      execution.status = 'failed';
      execution.errorMessage = error.message;
      await this.lifecycleRepository.updateExecution((execution as any)._id, execution);
      throw error;
    }
  }

  private async applyPolicyAction(
    lifecycle: NotificationLifecycle,
    action: LifecyclePolicy['actions'],
  ): Promise<void> {
    if (action.archive?.enabled) {
      await this.lifecycleRepository.updateLifecycle((lifecycle as any)._id, {
        archivalStatus: ArchivalStatus.ARCHIVED,
      });
    }

    if (action.delete?.enabled) {
      await this.lifecycleRepository.updateLifecycle((lifecycle as any)._id, {
        currentStage: LifecycleStage.DELETED,
      });
    }
  }

  async getLifecycleStatistics(): Promise<any> {
    const stats = await this.lifecycleRepository.getLifecycleStatistics();
    return stats;
  }

  async deleteLifecycle(id: string): Promise<boolean> {
    return this.lifecycleRepository.deleteLifecycle(id);
  }

  async updateLifecycleStage(
    id: string,
    stage: LifecycleStage,
  ): Promise<NotificationLifecycle | null> {
    return this.transitionLifecycle(id, stage);
  }

  async deletePolicy(id: string): Promise<boolean> {
    return this.lifecycleRepository.deletePolicy(id);
  }

  async deleteRetentionRule(id: string): Promise<boolean> {
    return this.lifecycleRepository.deleteRetentionRule(id);
  }

  async bulkUpdateLifecycleStage(ids: string[], stage: LifecycleStage): Promise<boolean> {
    const results = await Promise.all(ids.map((id) => this.transitionLifecycle(id, stage)));
    return results.every((result) => result !== null);
  }

  async bulkArchiveLifecycles(ids: string[]): Promise<boolean> {
    const results = await Promise.all(
      ids.map((id) =>
        this.lifecycleRepository.updateLifecycle(id, {
          currentStage: LifecycleStage.ARCHIVED,
        }),
      ),
    );
    return results.every((result) => result !== null);
  }

  async bulkDeleteLifecycles(ids: string[]): Promise<boolean> {
    const results = await Promise.all(
      ids.map((id) => this.lifecycleRepository.deleteLifecycle(id)),
    );
    return results.every((result) => result === true);
  }

  async generateDailyStatistics(): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const stats = await this.lifecycleRepository.getStatisticsByDateRange(startOfDay, endOfDay);

    return stats;
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processLifecyclePolicies(): Promise<void> {
    this.logger.log('Processing lifecycle policies...');

    const activePolicies = await this.getActivePolicies();
    for (const policy of activePolicies) {
      try {
        await this.executePolicy((policy as any)._id);
        this.logger.log(`Policy ${policy.name} executed successfully`);
      } catch (error) {
        this.logger.error(`Failed to execute policy ${policy.name}:`, error);
      }
    }

    this.logger.log('Lifecycle policies processing completed');
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredLifecycles(): Promise<void> {
    this.logger.log('Cleaning up expired lifecycles...');

    const expiredLifecycles = await this.lifecycleRepository.findLifecycles({
      stages: [LifecycleStage.DELETED],
    });

    for (const lifecycle of expiredLifecycles) {
      await this.lifecycleRepository.deleteLifecycle((lifecycle as any)._id);
    }

    this.logger.log(`Cleaned up ${expiredLifecycles.length} expired lifecycles`);
  }

  private async updateLifecycleAnalytics(lifecycle: NotificationLifecycle): Promise<void> {
    const engagementScore = this.calculateEngagementScore(lifecycle);
    const deliveryTime = this.calculateDeliveryTime(lifecycle);

    await this.lifecycleRepository.updateLifecycle((lifecycle as any)._id, {
      analytics: {
        engagementScore,
        deliveryTime,
        readTime: lifecycle.analytics?.readTime,
        clickTime: lifecycle.analytics?.clickTime,
      },
    });
  }

  private calculateEngagementScore(lifecycle: NotificationLifecycle): number {
    const stageWeights: Record<LifecycleStage, number> = {
      [LifecycleStage.CREATED]: 0,
      [LifecycleStage.SCHEDULED]: 0,
      [LifecycleStage.SENDING]: 0.1,
      [LifecycleStage.SENT]: 0.2,
      [LifecycleStage.DELIVERED]: 0.4,
      [LifecycleStage.READ]: 0.7,
      [LifecycleStage.CLICKED]: 0.8,
      [LifecycleStage.DISMISSED]: 0.3,
      [LifecycleStage.FAILED]: 0,
      [LifecycleStage.EXPIRED]: 0.1,
      [LifecycleStage.ARCHIVED]: 0.2,
      [LifecycleStage.DELETED]: 0,
    };

    return stageWeights[lifecycle.currentStage] || 0;
  }

  private calculateDeliveryTime(lifecycle: NotificationLifecycle): number {
    if (!lifecycle.stageHistory || lifecycle.stageHistory.length < 2) {
      return 0;
    }

    const sentStage = lifecycle.stageHistory.find((stage) => stage.stage === LifecycleStage.SENT);
    const deliveredStage = lifecycle.stageHistory.find(
      (stage) => stage.stage === LifecycleStage.DELIVERED,
    );

    if (!sentStage || !deliveredStage) {
      return 0;
    }

    return deliveredStage.timestamp.getTime() - sentStage.timestamp.getTime();
  }
}
