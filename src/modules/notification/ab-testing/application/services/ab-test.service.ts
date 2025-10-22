import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { AbTest, AbTestProps, AbTestStatus, AbTestType } from '../../domain/ab-test.entity';
import {
  AbTestParticipant,
  AbTestParticipantProps,
  ParticipantStatus,
} from '../../domain/ab-test-participant.entity';
import { AbTestRepository } from '../../infrastructure/ab-test.repository';
import { AbTestParticipantRepository } from '../../infrastructure/ab-test.repository';

export interface CreateAbTestDto {
  name: string;
  description?: string;
  testType: AbTestType;
  variations: {
    id: string;
    name: string;
    description?: string;
    content: Record<string, any>;
    isControl: boolean;
    weight?: number;
  }[];
  targetAudience: {
    userSegments?: string[];
    categories?: string[];
    channels?: string[];
    userIds?: string[];
    criteria?: Record<string, any>;
  };
  duration: {
    startDate: Date;
    endDate: Date;
  };
  successMetrics: {
    primary: string;
    secondary?: string[];
    conversionEvents?: string[];
  };
  settings: {
    minSampleSize?: number;
    maxSampleSize?: number;
    confidenceLevel?: number;
    significanceThreshold?: number;
  };
}

export interface UpdateAbTestDto {
  name?: string;
  description?: string;
  variations?: CreateAbTestDto['variations'];
  targetAudience?: CreateAbTestDto['targetAudience'];
  duration?: CreateAbTestDto['duration'];
  successMetrics?: CreateAbTestDto['successMetrics'];
  settings?: CreateAbTestDto['settings'];
}

export interface EnrollParticipantDto {
  testId: string;
  userId: string;
  variationId?: string;
  attributes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ExposeParticipantDto {
  testId: string;
  userId: string;
  channel: string;
  notificationId?: string;
  templateId?: string;
  content: Record<string, any>;
}

export interface RecordInteractionDto {
  testId: string;
  userId: string;
  type: 'delivered' | 'opened' | 'clicked' | 'converted' | 'dismissed' | 'bounced';
  metadata?: Record<string, any>;
}

export interface RecordConversionDto {
  testId: string;
  userId: string;
  metricName: string;
  value: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class AbTestService {
  private readonly logger = new Logger(AbTestService.name);

  constructor(
    @Inject('AbTestRepository') private readonly abTestRepository: AbTestRepository,
    @Inject('AbTestParticipantRepository')
    private readonly participantRepository: AbTestParticipantRepository,
  ) {}

  async createAbTest(dto: CreateAbTestDto, createdBy: string): Promise<AbTest> {
    this.logger.log(`Creating A/B test: ${dto.name}`);

    // Check if test with same name already exists
    const existingTest = await this.abTestRepository.findByName(dto.name);
    if (existingTest) {
      throw new ConflictException(`AbTest with name '${dto.name}' already exists`);
    }

    try {
      const abTest = AbTest.create({
        name: dto.name,
        description: dto.description,
        testType: dto.testType,
        status: AbTestStatus.DRAFT,
        targetAudience: dto.targetAudience,
        variations: dto.variations.map((v) => ({
          id: v.id,
          name: v.name,
          content: v.content,
          isControl: v.isControl,
          weight: v.weight || 1,
        })),
        trafficAllocation: {
          control: dto.variations.find((v) => v.isControl)?.weight || 50,
          variants: dto.variations
            .filter((v) => !v.isControl)
            .map((v) => ({
              variationId: v.id,
              percentage: v.weight || 50,
            })),
        },
        successMetrics: [
          {
            name: dto.successMetrics.primary,
            type: 'conversion',
            isPrimary: true,
          },
          ...(dto.successMetrics.secondary || []).map((metric) => ({
            name: metric,
            type: 'conversion' as const,
            isPrimary: false,
          })),
        ],
        duration: dto.duration,
        statisticalSettings: {
          confidenceLevel: dto.settings.confidenceLevel || 95,
          minimumSampleSize: dto.settings.minSampleSize || 100,
          significanceThreshold: dto.settings.significanceThreshold || 0.05,
          maxParticipants: dto.settings.maxSampleSize,
        },
        settings: {
          autoStopOnSignificance: true,
          autoStopOnMaxDuration: true,
          notifyOnCompletion: true,
          notifyOnSignificance: true,
        },
        createdBy,
        metadata: {
          tags: [],
          priority: 1,
        },
      });

      const savedTest = await this.abTestRepository.save(abTest);
      this.logger.log(`AbTest created: ${savedTest.name} (${savedTest.id})`);
      return savedTest;
    } catch (error) {
      this.logger.error(`Failed to create AbTest: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAbTestById(id: string): Promise<AbTest> {
    const test = await this.abTestRepository.findById(id);
    if (!test) {
      throw new NotFoundException(`AbTest with ID '${id}' not found`);
    }
    return test;
  }

  async getAbTests(
    filters: any,
    sort: any,
    pagination: any,
  ): Promise<{ tests: AbTest[]; total: number; page: number; limit: number }> {
    return await this.abTestRepository.findAll(filters, sort, pagination);
  }

  async updateAbTest(id: string, dto: UpdateAbTestDto, updatedBy: string): Promise<AbTest> {
    const test = await this.getAbTestById(id);

    // Check if new name conflicts with existing test
    if (dto.name && dto.name !== test.name) {
      const existingTest = await this.abTestRepository.findByName(dto.name);
      if (existingTest) {
        throw new ConflictException(`AbTest with name '${dto.name}' already exists`);
      }
    }

    // Convert DTO to entity format
    const updateData: Partial<AbTestProps> = {
      updatedBy,
    };

    if (dto.name) updateData.name = dto.name;
    if (dto.description) updateData.description = dto.description;
    if (dto.variations) {
      updateData.variations = dto.variations.map((v) => ({
        id: v.id,
        name: v.name,
        content: v.content,
        isControl: v.isControl,
        weight: v.weight || 1,
      }));
    }
    if (dto.targetAudience) updateData.targetAudience = dto.targetAudience;
    if (dto.duration) updateData.duration = dto.duration;
    if (dto.successMetrics) {
      updateData.successMetrics = [
        {
          name: dto.successMetrics.primary,
          type: 'conversion',
          isPrimary: true,
        },
        ...(dto.successMetrics.secondary || []).map((metric) => ({
          name: metric,
          type: 'conversion' as const,
          isPrimary: false,
        })),
      ];
    }
    if (dto.settings) {
      updateData.statisticalSettings = {
        confidenceLevel: dto.settings.confidenceLevel || 95,
        minimumSampleSize: dto.settings.minSampleSize || 100,
        significanceThreshold: dto.settings.significanceThreshold || 0.05,
        maxParticipants: dto.settings.maxSampleSize,
      };
    }

    test.updateContent(updateData);

    return await this.abTestRepository.save(test);
  }

  async deleteAbTest(id: string): Promise<void> {
    const test = await this.getAbTestById(id);

    if (test.status === AbTestStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active AbTest');
    }

    await this.abTestRepository.deleteById(id);
  }

  async startAbTest(id: string, startedBy: string): Promise<AbTest> {
    const test = await this.getAbTestById(id);
    test.start(startedBy);
    return await this.abTestRepository.save(test);
  }

  async stopAbTest(id: string, stoppedBy: string): Promise<AbTest> {
    const test = await this.getAbTestById(id);
    test.stop(stoppedBy);
    return await this.abTestRepository.save(test);
  }

  async pauseAbTest(id: string): Promise<AbTest> {
    const test = await this.getAbTestById(id);
    test.pause();
    return await this.abTestRepository.save(test);
  }

  async resumeAbTest(id: string): Promise<AbTest> {
    const test = await this.getAbTestById(id);
    test.resume();
    return await this.abTestRepository.save(test);
  }

  async enrollParticipant(dto: EnrollParticipantDto): Promise<AbTestParticipant> {
    const test = await this.getAbTestById(dto.testId);

    if (test.status !== AbTestStatus.ACTIVE) {
      throw new BadRequestException('Test is not active');
    }

    // Check if user is already enrolled
    const existingParticipant = await this.participantRepository.findByTestAndUser(
      dto.testId,
      dto.userId,
    );
    if (existingParticipant) {
      throw new ConflictException('User is already enrolled in this test');
    }

    // Assign variation
    const variationId = dto.variationId || this.assignVariation(test);

    const participant = AbTestParticipant.create({
      testId: dto.testId,
      userId: dto.userId,
      variationId,
      status: ParticipantStatus.ENROLLED,
      assignment: {
        method: dto.variationId ? 'manual' : 'random',
        timestamp: new Date(),
        reason: dto.variationId ? 'Manual assignment' : 'Random assignment',
      },
      exposure: {
        timestamp: new Date(),
        channel: 'unknown',
        content: {},
      },
      interactions: [],
      conversions: [],
      attributes: dto.attributes || {},
      enrolledAt: new Date(),
      metadata: dto.metadata || {},
    });

    return await this.participantRepository.save(participant);
  }

  async exposeParticipant(dto: ExposeParticipantDto): Promise<AbTestParticipant> {
    const participant = await this.participantRepository.findByTestAndUser(dto.testId, dto.userId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.status !== ParticipantStatus.ENROLLED) {
      throw new BadRequestException('Participant is not enrolled');
    }

    participant.expose({
      timestamp: new Date(),
      channel: dto.channel,
      notificationId: dto.notificationId,
      templateId: dto.templateId,
      content: dto.content,
    });

    return await this.participantRepository.save(participant);
  }

  async recordInteraction(dto: RecordInteractionDto): Promise<AbTestParticipant> {
    const participant = await this.participantRepository.findByTestAndUser(dto.testId, dto.userId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.recordInteraction({
      type: dto.type,
      timestamp: new Date(),
      metadata: dto.metadata,
    });

    return await this.participantRepository.save(participant);
  }

  async recordConversion(dto: RecordConversionDto): Promise<AbTestParticipant> {
    const participant = await this.participantRepository.findByTestAndUser(dto.testId, dto.userId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.recordConversion({
      metricName: dto.metricName,
      value: dto.value,
      timestamp: new Date(),
      metadata: dto.metadata,
    });

    return await this.participantRepository.save(participant);
  }

  async getTestResults(id: string): Promise<any> {
    const test = await this.getAbTestById(id);
    const participants = await this.participantRepository.findByTestId(id);

    // Calculate results
    const results = this.calculateTestResults(test, participants);
    test.updateResults(results);
    await this.abTestRepository.save(test);

    return {
      testId: id,
      testName: test.name,
      ...results,
    };
  }

  async getTestStatistics(id: string): Promise<any> {
    const test = await this.getAbTestById(id);
    const participants = await this.participantRepository.findByTestId(id);

    return {
      testId: id,
      testName: test.name,
      totalParticipants: participants.length,
      status: test.status,
      duration: {
        startDate: test.toPersistence().duration.startDate,
        endDate: test.toPersistence().duration.endDate,
      },
      variations: test.variations.map((v) => ({
        id: v.id,
        name: v.name,
        participants: participants.filter((p: AbTestParticipant) => p.variationId === v.id).length,
      })),
    };
  }

  async getTestsForUser(userId: string): Promise<AbTest[]> {
    const participants = await this.participantRepository.findByUserId(userId);
    const testIds = participants.map((p: AbTestParticipant) => p.testId);
    return await this.abTestRepository.findByIds(testIds);
  }

  async getEligibleTests(
    userId: string,
    userSegments?: string[],
    categories?: string[],
    channels?: string[],
  ): Promise<AbTest[]> {
    return await this.abTestRepository.findEligibleForUser(
      userId,
      userSegments,
      categories,
      channels,
    );
  }

  async cleanupCompletedTests(): Promise<{ deletedCount: number }> {
    const completedTests = await this.abTestRepository.findByStatus(AbTestStatus.COMPLETED);
    let deletedCount = 0;

    for (const test of completedTests) {
      // Delete participants first
      await this.participantRepository.deleteByTestId(test.id);
      // Delete test
      await this.abTestRepository.deleteById(test.id);
      deletedCount++;
    }

    return { deletedCount };
  }

  private assignVariation(test: AbTest): string {
    const variations = test.variations;
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variation of variations) {
      cumulative += variation.weight || 1;
      if (random <= cumulative) {
        return variation.id;
      }
    }

    return variations[0].id; // Fallback to first variation
  }

  private calculateTestResults(test: AbTest, participants: AbTestParticipant[]): any {
    const controlVariation = test.variations.find((v) => v.isControl);
    const variantVariations = test.variations.filter((v) => !v.isControl);

    if (!controlVariation) {
      return {
        statisticalSignificance: false,
        winner: null,
        recommendations: ['No control group found'],
      };
    }

    const controlParticipants = participants.filter((p) => p.variationId === controlVariation.id);
    const controlConversions = controlParticipants.filter(
      (p) => p.status === ParticipantStatus.CONVERTED,
    ).length;
    const controlRate =
      controlParticipants.length > 0 ? controlConversions / controlParticipants.length : 0;

    const variantResults = variantVariations.map((variant) => {
      const variantParticipants = participants.filter((p) => p.variationId === variant.id);
      const variantConversions = variantParticipants.filter(
        (p) => p.status === ParticipantStatus.CONVERTED,
      ).length;
      const variantRate =
        variantParticipants.length > 0 ? variantConversions / variantParticipants.length : 0;

      return {
        variationId: variant.id,
        participants: variantParticipants.length,
        conversions: variantConversions,
        conversionRate: variantRate,
        improvement: controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0,
      };
    });

    const bestVariant = variantResults.reduce(
      (best, current) => (current.conversionRate > best.conversionRate ? current : best),
      variantResults[0] || { conversionRate: 0 },
    );

    return {
      totalParticipants: participants.length,
      controlGroup: {
        participants: controlParticipants.length,
        conversions: controlConversions,
        conversionRate: controlRate,
      },
      variants: variantResults,
      statisticalSignificance: this.calculateStatisticalSignificance(
        controlRate,
        bestVariant.conversionRate,
        controlParticipants.length,
        bestVariant.participants,
      ),
      winner: bestVariant.conversionRate > controlRate ? bestVariant.variationId : null,
      recommendations: this.generateRecommendations(
        participants.length,
        test.toPersistence().statisticalSettings.minimumSampleSize,
      ),
    };
  }

  private calculateStatisticalSignificance(
    controlRate: number,
    variantRate: number,
    controlSample: number,
    variantSample: number,
  ): boolean {
    // Simplified statistical significance calculation
    if (controlSample < 30 || variantSample < 30) return false;

    const pooledRate =
      (controlRate * controlSample + variantRate * variantSample) / (controlSample + variantSample);
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlSample + 1 / variantSample));
    const zScore = Math.abs(variantRate - controlRate) / se;

    return zScore > 1.96; // 95% confidence level
  }

  private generateRecommendations(currentSample: number, minSample: number): string[] {
    const recommendations = [];

    if (currentSample < minSample) {
      recommendations.push(
        `Test needs more participants to reach statistical significance (${minSample - currentSample} more needed)`,
      );
    }

    if (currentSample >= minSample) {
      recommendations.push('Test has sufficient sample size for statistical analysis');
    }

    return recommendations;
  }
}
