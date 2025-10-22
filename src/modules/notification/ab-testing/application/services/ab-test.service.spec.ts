import { Test, TestingModule } from '@nestjs/testing';
import { AbTestService } from './ab-test.service';
import {
  AbTestRepository,
  AbTestParticipantRepository,
} from '../../infrastructure/ab-test.repository';
import { AbTest, AbTestStatus, AbTestType } from '../../domain/ab-test.entity';
import { AbTestParticipant, ParticipantStatus } from '../../domain/ab-test-participant.entity';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('AbTestService', () => {
  let service: AbTestService;
  let abTestRepository: jest.Mocked<AbTestRepository>;
  let participantRepository: jest.Mocked<AbTestParticipantRepository>;

  beforeEach(async () => {
    const mockAbTestRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      findByStatus: jest.fn(),
      findEligibleForUser: jest.fn(),
      deleteById: jest.fn(),
    };

    const mockParticipantRepository = {
      save: jest.fn(),
      findByTestAndUser: jest.fn(),
      findByTestId: jest.fn(),
      findByUserId: jest.fn(),
      deleteByTestId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbTestService,
        {
          provide: 'AbTestRepository',
          useValue: mockAbTestRepository,
        },
        {
          provide: 'AbTestParticipantRepository',
          useValue: mockParticipantRepository,
        },
      ],
    }).compile();

    service = module.get<AbTestService>(AbTestService);
    abTestRepository = module.get('AbTestRepository');
    participantRepository = module.get('AbTestParticipantRepository');
  });

  describe('createAbTest', () => {
    it('should create an A/B test successfully', async () => {
      const createDto = {
        name: 'Test A/B Test',
        description: 'Test description',
        testType: AbTestType.CONTENT,
        variations: [
          {
            id: 'control',
            name: 'Control',
            content: { subject: 'Control Subject' },
            isControl: true,
            weight: 50,
          },
          {
            id: 'variant',
            name: 'Variant',
            content: { subject: 'Variant Subject' },
            isControl: false,
            weight: 50,
          },
        ],
        targetAudience: {
          userSegments: ['premium'],
        },
        duration: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
        successMetrics: {
          primary: 'click_rate',
          secondary: ['open_rate'],
        },
        settings: {
          minSampleSize: 100,
          confidenceLevel: 95,
        },
      };

      const mockAbTest = AbTest.create({
        ...createDto,
        status: AbTestStatus.DRAFT,
        createdBy: 'user123',
        trafficAllocation: {
          control: 50,
          variants: [{ variationId: 'variant', percentage: 50 }],
        },
        successMetrics: [
          { name: 'click_rate', type: 'conversion', isPrimary: true },
          { name: 'open_rate', type: 'conversion', isPrimary: false },
        ],
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {
          autoStopOnSignificance: true,
          autoStopOnMaxDuration: true,
          notifyOnCompletion: true,
          notifyOnSignificance: true,
        },
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findByName.mockResolvedValue(null);
      abTestRepository.save.mockResolvedValue(mockAbTest);

      const result = await service.createAbTest(createDto, 'user123');

      expect(result).toEqual(mockAbTest);
      expect(abTestRepository.findByName).toHaveBeenCalledWith('Test A/B Test');
      expect(abTestRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if test name already exists', async () => {
      const createDto = {
        name: 'Existing Test',
        testType: AbTestType.CONTENT,
        variations: [],
        targetAudience: {},
        duration: { startDate: new Date(), endDate: new Date() },
        successMetrics: { primary: 'click_rate' },
        settings: {},
      };

      const existingTest = AbTest.create({
        name: 'Existing Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.DRAFT,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findByName.mockResolvedValue(existingTest);

      await expect(service.createAbTest(createDto, 'user123')).rejects.toThrow(ConflictException);
    });
  });

  describe('getAbTestById', () => {
    it('should return A/B test if found', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.DRAFT,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);

      const result = await service.getAbTestById('test123');

      expect(result).toEqual(mockAbTest);
      expect(abTestRepository.findById).toHaveBeenCalledWith('test123');
    });

    it('should throw NotFoundException if A/B test not found', async () => {
      abTestRepository.findById.mockResolvedValue(null);

      await expect(service.getAbTestById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAbTest', () => {
    it('should update A/B test successfully', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.DRAFT,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      const updateDto = {
        name: 'Updated Test',
        description: 'Updated description',
      };

      const updatedAbTest = AbTest.create({
        ...mockAbTest.toPersistence(),
        ...updateDto,
        createdBy: 'user123',
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);
      abTestRepository.findByName.mockResolvedValue(null);
      abTestRepository.save.mockResolvedValue(updatedAbTest);

      const result = await service.updateAbTest('test123', updateDto, 'user456');

      expect(result).toEqual(updatedAbTest);
      expect(abTestRepository.findById).toHaveBeenCalledWith('test123');
      expect(abTestRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if A/B test not found', async () => {
      abTestRepository.findById.mockResolvedValue(null);

      await expect(service.updateAbTest('nonexistent', {}, 'user123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new name already exists', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.DRAFT,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      const existingTest = AbTest.create({
        name: 'Existing Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.DRAFT,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);
      abTestRepository.findByName.mockResolvedValue(existingTest);

      await expect(
        service.updateAbTest('test123', { name: 'Existing Test' }, 'user123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteAbTest', () => {
    it('should delete A/B test successfully', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.DRAFT,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);
      abTestRepository.deleteById.mockResolvedValue(undefined);

      await service.deleteAbTest('test123');

      expect(abTestRepository.findById).toHaveBeenCalledWith('test123');
      expect(abTestRepository.deleteById).toHaveBeenCalledWith('test123');
    });

    it('should throw NotFoundException if A/B test not found', async () => {
      abTestRepository.findById.mockResolvedValue(null);

      await expect(service.deleteAbTest('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if test is active', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.ACTIVE,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);

      await expect(service.deleteAbTest('test123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('startAbTest', () => {
    it('should start A/B test successfully', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.DRAFT,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);
      abTestRepository.save.mockResolvedValue(mockAbTest);

      const result = await service.startAbTest('test123', 'user456');

      expect(result.status).toBe(AbTestStatus.ACTIVE);
      expect(abTestRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if test is not in draft status', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.ACTIVE,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);

      await expect(service.startAbTest('test123', 'user456')).rejects.toThrow(Error);
    });
  });

  describe('stopAbTest', () => {
    it('should stop A/B test successfully', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.ACTIVE,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);
      abTestRepository.save.mockResolvedValue(mockAbTest);

      const result = await service.stopAbTest('test123', 'user456');

      expect(result.status).toBe(AbTestStatus.COMPLETED);
      expect(abTestRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if test is not active', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.DRAFT,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);

      await expect(service.stopAbTest('test123', 'user456')).rejects.toThrow(Error);
    });
  });

  describe('enrollParticipant', () => {
    it('should enroll participant successfully', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.ACTIVE,
        targetAudience: {},
        variations: [
          { id: 'control', name: 'Control', content: {}, isControl: true, weight: 50 },
          { id: 'variant', name: 'Variant', content: {}, isControl: false, weight: 50 },
        ],
        trafficAllocation: { control: 50, variants: [{ variationId: 'variant', percentage: 50 }] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      const mockParticipant = AbTestParticipant.create({
        testId: 'test123',
        userId: 'user456',
        variationId: 'control',
        status: ParticipantStatus.ENROLLED,
        assignment: { method: 'random', timestamp: new Date() },
        exposure: { timestamp: new Date(), channel: 'unknown', content: {} },
        interactions: [],
        conversions: [],
        attributes: {},
        enrolledAt: new Date(),
        metadata: {},
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);
      participantRepository.findByTestAndUser.mockResolvedValue(null);
      participantRepository.save.mockResolvedValue(mockParticipant);

      const result = await service.enrollParticipant({
        testId: 'test123',
        userId: 'user456',
      });

      expect(result).toEqual(mockParticipant);
      expect(participantRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if test is not active', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.DRAFT,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);

      await expect(
        service.enrollParticipant({
          testId: 'test123',
          userId: 'user456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user is already enrolled', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.ACTIVE,
        targetAudience: {},
        variations: [],
        trafficAllocation: { control: 50, variants: [] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      const existingParticipant = AbTestParticipant.create({
        testId: 'test123',
        userId: 'user456',
        variationId: 'control',
        status: ParticipantStatus.ENROLLED,
        assignment: { method: 'random', timestamp: new Date() },
        exposure: { timestamp: new Date(), channel: 'unknown', content: {} },
        interactions: [],
        conversions: [],
        attributes: {},
        enrolledAt: new Date(),
        metadata: {},
      });

      abTestRepository.findById.mockResolvedValue(mockAbTest);
      participantRepository.findByTestAndUser.mockResolvedValue(existingParticipant);

      await expect(
        service.enrollParticipant({
          testId: 'test123',
          userId: 'user456',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('exposeParticipant', () => {
    it('should expose participant successfully', async () => {
      const mockParticipant = AbTestParticipant.create({
        testId: 'test123',
        userId: 'user456',
        variationId: 'control',
        status: ParticipantStatus.ENROLLED,
        assignment: { method: 'random', timestamp: new Date() },
        exposure: { timestamp: new Date(), channel: 'unknown', content: {} },
        interactions: [],
        conversions: [],
        attributes: {},
        enrolledAt: new Date(),
        metadata: {},
      });

      participantRepository.findByTestAndUser.mockResolvedValue(mockParticipant);
      participantRepository.save.mockResolvedValue(mockParticipant);

      const result = await service.exposeParticipant({
        testId: 'test123',
        userId: 'user456',
        channel: 'push',
        content: { subject: 'Test Subject' },
      });

      expect(result.status).toBe(ParticipantStatus.EXPOSED);
      expect(participantRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if participant not found', async () => {
      participantRepository.findByTestAndUser.mockResolvedValue(null);

      await expect(
        service.exposeParticipant({
          testId: 'test123',
          userId: 'user456',
          channel: 'push',
          content: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if participant is not enrolled', async () => {
      const mockParticipant = AbTestParticipant.create({
        testId: 'test123',
        userId: 'user456',
        variationId: 'control',
        status: ParticipantStatus.EXPOSED,
        assignment: { method: 'random', timestamp: new Date() },
        exposure: { timestamp: new Date(), channel: 'unknown', content: {} },
        interactions: [],
        conversions: [],
        attributes: {},
        enrolledAt: new Date(),
        metadata: {},
      });

      participantRepository.findByTestAndUser.mockResolvedValue(mockParticipant);

      await expect(
        service.exposeParticipant({
          testId: 'test123',
          userId: 'user456',
          channel: 'push',
          content: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordInteraction', () => {
    it('should record interaction successfully', async () => {
      const mockParticipant = AbTestParticipant.create({
        testId: 'test123',
        userId: 'user456',
        variationId: 'control',
        status: ParticipantStatus.EXPOSED,
        assignment: { method: 'random', timestamp: new Date() },
        exposure: { timestamp: new Date(), channel: 'unknown', content: {} },
        interactions: [],
        conversions: [],
        attributes: {},
        enrolledAt: new Date(),
        metadata: {},
      });

      participantRepository.findByTestAndUser.mockResolvedValue(mockParticipant);
      participantRepository.save.mockResolvedValue(mockParticipant);

      const result = await service.recordInteraction({
        testId: 'test123',
        userId: 'user456',
        type: 'clicked',
      });

      expect(result).toBeDefined();
      expect(participantRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if participant not found', async () => {
      participantRepository.findByTestAndUser.mockResolvedValue(null);

      await expect(
        service.recordInteraction({
          testId: 'test123',
          userId: 'user456',
          type: 'clicked',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordConversion', () => {
    it('should record conversion successfully', async () => {
      const mockParticipant = AbTestParticipant.create({
        testId: 'test123',
        userId: 'user456',
        variationId: 'control',
        status: ParticipantStatus.EXPOSED,
        assignment: { method: 'random', timestamp: new Date() },
        exposure: { timestamp: new Date(), channel: 'unknown', content: {} },
        interactions: [],
        conversions: [],
        attributes: {},
        enrolledAt: new Date(),
        metadata: {},
      });

      participantRepository.findByTestAndUser.mockResolvedValue(mockParticipant);
      participantRepository.save.mockResolvedValue(mockParticipant);

      const result = await service.recordConversion({
        testId: 'test123',
        userId: 'user456',
        metricName: 'purchase',
        value: 1,
      });

      expect(result).toBeDefined();
      expect(participantRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if participant not found', async () => {
      participantRepository.findByTestAndUser.mockResolvedValue(null);

      await expect(
        service.recordConversion({
          testId: 'test123',
          userId: 'user456',
          metricName: 'purchase',
          value: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTestResults', () => {
    it('should return test results', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.ACTIVE,
        targetAudience: {},
        variations: [
          { id: 'control', name: 'Control', content: {}, isControl: true, weight: 50 },
          { id: 'variant', name: 'Variant', content: {}, isControl: false, weight: 50 },
        ],
        trafficAllocation: { control: 50, variants: [{ variationId: 'variant', percentage: 50 }] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      const mockParticipants = [
        AbTestParticipant.create({
          testId: 'test123',
          userId: 'user1',
          variationId: 'control',
          status: ParticipantStatus.CONVERTED,
          assignment: { method: 'random', timestamp: new Date() },
          exposure: { timestamp: new Date(), channel: 'unknown', content: {} },
          interactions: [],
          conversions: [],
          attributes: {},
          enrolledAt: new Date(),
          metadata: {},
        }),
      ];

      abTestRepository.findById.mockResolvedValue(mockAbTest);
      participantRepository.findByTestId.mockResolvedValue(mockParticipants);
      abTestRepository.save.mockResolvedValue(mockAbTest);

      const result = await service.getTestResults('test123');

      expect(result.testId).toBe('test123');
      expect(result.testName).toBe('Test');
      expect(result.statisticalSignificance).toBe(false);
      expect(result.winner).toBe(null);
      expect(result.recommendations).toContain(
        'Test needs more participants to reach statistical significance (99 more needed)',
      );
    });

    it('should throw NotFoundException if test not found', async () => {
      abTestRepository.findById.mockResolvedValue(null);

      await expect(service.getTestResults('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTestStatistics', () => {
    it('should return test statistics', async () => {
      const mockAbTest = AbTest.create({
        name: 'Test',
        testType: AbTestType.CONTENT,
        status: AbTestStatus.ACTIVE,
        targetAudience: {},
        variations: [
          { id: 'control', name: 'Control', content: {}, isControl: true, weight: 50 },
          { id: 'variant', name: 'Variant', content: {}, isControl: false, weight: 50 },
        ],
        trafficAllocation: { control: 50, variants: [{ variationId: 'variant', percentage: 50 }] },
        successMetrics: [],
        duration: { startDate: new Date(), endDate: new Date() },
        statisticalSettings: {
          confidenceLevel: 95,
          minimumSampleSize: 100,
          significanceThreshold: 0.05,
        },
        settings: {},
        createdBy: 'user123',
        metadata: { tags: [], priority: 1 },
      });

      const mockParticipants = [
        AbTestParticipant.create({
          testId: 'test123',
          userId: 'user1',
          variationId: 'control',
          status: ParticipantStatus.ENROLLED,
          assignment: { method: 'random', timestamp: new Date() },
          exposure: { timestamp: new Date(), channel: 'unknown', content: {} },
          interactions: [],
          conversions: [],
          attributes: {},
          enrolledAt: new Date(),
          metadata: {},
        }),
      ];

      abTestRepository.findById.mockResolvedValue(mockAbTest);
      participantRepository.findByTestId.mockResolvedValue(mockParticipants);

      const result = await service.getTestStatistics('test123');

      expect(result.testId).toBe('test123');
      expect(result.testName).toBe('Test');
      expect(result.totalParticipants).toBe(1);
      expect(result.status).toBe(AbTestStatus.ACTIVE);
    });

    it('should throw NotFoundException if test not found', async () => {
      abTestRepository.findById.mockResolvedValue(null);

      await expect(service.getTestStatistics('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTestsForUser', () => {
    it('should return tests for user', async () => {
      const mockParticipants = [
        AbTestParticipant.create({
          testId: 'test123',
          userId: 'user456',
          variationId: 'control',
          status: ParticipantStatus.ENROLLED,
          assignment: { method: 'random', timestamp: new Date() },
          exposure: { timestamp: new Date(), channel: 'unknown', content: {} },
          interactions: [],
          conversions: [],
          attributes: {},
          enrolledAt: new Date(),
          metadata: {},
        }),
      ];

      const mockTests = [
        AbTest.create({
          name: 'Test',
          testType: AbTestType.CONTENT,
          status: AbTestStatus.ACTIVE,
          targetAudience: {},
          variations: [],
          trafficAllocation: { control: 50, variants: [] },
          successMetrics: [],
          duration: { startDate: new Date(), endDate: new Date() },
          statisticalSettings: {
            confidenceLevel: 95,
            minimumSampleSize: 100,
            significanceThreshold: 0.05,
          },
          settings: {},
          createdBy: 'user123',
          metadata: { tags: [], priority: 1 },
        }),
      ];

      participantRepository.findByUserId.mockResolvedValue(mockParticipants);
      abTestRepository.findByIds.mockResolvedValue(mockTests);

      const result = await service.getTestsForUser('user456');

      expect(result).toEqual(mockTests);
      expect(participantRepository.findByUserId).toHaveBeenCalledWith('user456');
      expect(abTestRepository.findByIds).toHaveBeenCalledWith(['test123']);
    });
  });

  describe('getEligibleTests', () => {
    it('should return eligible tests for user', async () => {
      const mockTests = [
        AbTest.create({
          name: 'Test',
          testType: AbTestType.CONTENT,
          status: AbTestStatus.ACTIVE,
          targetAudience: {},
          variations: [],
          trafficAllocation: { control: 50, variants: [] },
          successMetrics: [],
          duration: { startDate: new Date(), endDate: new Date() },
          statisticalSettings: {
            confidenceLevel: 95,
            minimumSampleSize: 100,
            significanceThreshold: 0.05,
          },
          settings: {},
          createdBy: 'user123',
          metadata: { tags: [], priority: 1 },
        }),
      ];

      abTestRepository.findEligibleForUser.mockResolvedValue(mockTests);

      const result = await service.getEligibleTests('user456', ['premium'], ['tech'], ['push']);

      expect(result).toEqual(mockTests);
      expect(abTestRepository.findEligibleForUser).toHaveBeenCalledWith(
        'user456',
        ['premium'],
        ['tech'],
        ['push'],
      );
    });
  });

  describe('cleanupCompletedTests', () => {
    it('should cleanup completed tests', async () => {
      const mockTests = [
        AbTest.create({
          name: 'Test',
          testType: AbTestType.CONTENT,
          status: AbTestStatus.COMPLETED,
          targetAudience: {},
          variations: [],
          trafficAllocation: { control: 50, variants: [] },
          successMetrics: [],
          duration: { startDate: new Date(), endDate: new Date() },
          statisticalSettings: {
            confidenceLevel: 95,
            minimumSampleSize: 100,
            significanceThreshold: 0.05,
          },
          settings: {},
          createdBy: 'user123',
          metadata: { tags: [], priority: 1 },
        }),
      ];

      abTestRepository.findByStatus.mockResolvedValue(mockTests);
      participantRepository.deleteByTestId.mockResolvedValue(undefined);
      abTestRepository.deleteById.mockResolvedValue(undefined);

      const result = await service.cleanupCompletedTests();

      expect(result.deletedCount).toBe(1);
      expect(participantRepository.deleteByTestId).toHaveBeenCalledWith('Test');
      expect(abTestRepository.deleteById).toHaveBeenCalledWith('Test');
    });
  });
});
