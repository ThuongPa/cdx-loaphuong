import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { AbTestModule } from '../../../src/modules/notification/ab-testing/ab-test.module';
import {
  AbTest,
  AbTestDocument,
} from '../../../src/modules/notification/ab-testing/ab-test.schema';
import {
  AbTestParticipant,
  AbTestParticipantDocument,
} from '../../../src/modules/notification/ab-testing/ab-test-participant.schema';
import { StructuredLoggerService } from '../../../src/infrastructure/logging/structured-logger.service';

describe('AbTest Integration Tests', () => {
  let app: INestApplication;
  let abTestModel: Model<AbTestDocument>;
  let participantModel: Model<AbTestParticipantDocument>;
  let structuredLogger: StructuredLoggerService;

  const mockAbTest = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test A/B Test',
    description: 'Test Description',
    testType: 'content',
    variations: [
      {
        id: 'control',
        name: 'Control',
        description: 'Control variation',
        content: { title: 'Original Title' },
        isControl: true,
        weight: 1,
      },
      {
        id: 'variant1',
        name: 'Variant 1',
        description: 'Test variation',
        content: { title: 'New Title' },
        isControl: false,
        weight: 1,
      },
    ],
    targetAudience: {
      userSegments: ['premium'],
      categories: ['news'],
      channels: ['email'],
    },
    duration: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    },
    successMetrics: {
      primary: 'click_rate',
      secondary: ['open_rate'],
      conversionEvents: ['click', 'open'],
    },
    settings: {
      minSampleSize: 100,
      maxSampleSize: 1000,
      confidenceLevel: 0.95,
      significanceThreshold: 0.05,
      autoStop: true,
      autoStopThreshold: 0.99,
    },
    status: 'draft',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockParticipant = {
    _id: '507f1f77bcf86cd799439012',
    testId: '507f1f77bcf86cd799439011',
    userId: 'user123',
    variationId: 'control',
    status: 'enrolled',
    enrolledAt: new Date(),
    interactions: [],
    conversions: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStructuredLogger = {
    logBusinessEvent: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AbTestModule],
    })
      .overrideProvider(StructuredLoggerService)
      .useValue(mockStructuredLogger)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    abTestModel = moduleFixture.get<Model<AbTestDocument>>(getModelToken(AbTest.name));
    participantModel = moduleFixture.get<Model<AbTestParticipantDocument>>(
      getModelToken(AbTestParticipant.name),
    );
    structuredLogger = moduleFixture.get<StructuredLoggerService>(StructuredLoggerService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await abTestModel.deleteMany({});
    await participantModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('A/B Test CRUD Operations', () => {
    it('should create an A/B test', async () => {
      const testData = {
        name: 'Test A/B Test',
        description: 'Test Description',
        testType: 'content',
        variations: [
          {
            id: 'control',
            name: 'Control',
            description: 'Control variation',
            content: { title: 'Original Title' },
            isControl: true,
            weight: 1,
          },
          {
            id: 'variant1',
            name: 'Variant 1',
            description: 'Test variation',
            content: { title: 'New Title' },
            isControl: false,
            weight: 1,
          },
        ],
        targetAudience: {
          userSegments: ['premium'],
          categories: ['news'],
          channels: ['email'],
        },
        duration: {
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-01-31').toISOString(),
        },
        successMetrics: {
          primary: 'click_rate',
          secondary: ['open_rate'],
          conversionEvents: ['click', 'open'],
        },
        settings: {
          minSampleSize: 100,
          maxSampleSize: 1000,
          confidenceLevel: 0.95,
          significanceThreshold: 0.05,
          autoStop: true,
          autoStopThreshold: 0.99,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/ab-tests')
        .send(testData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test A/B Test');
      expect(response.body.data.testType).toBe('content');
      expect(response.body.data.variations).toHaveLength(2);
      expect(response.body.data.status).toBe('draft');
    });

    it('should get A/B tests with pagination', async () => {
      // Create test A/B tests
      await abTestModel.create([
        { ...mockAbTest, name: 'Test 1' },
        { ...mockAbTest, name: 'Test 2' },
        { ...mockAbTest, name: 'Test 3' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/ab-tests')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tests).toHaveLength(2);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.totalPages).toBe(2);
    });

    it('should get A/B test by ID', async () => {
      const test = await abTestModel.create(mockAbTest);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/ab-tests/${test._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test A/B Test');
      expect(response.body.data.testType).toBe('content');
    });

    it('should update A/B test', async () => {
      const test = await abTestModel.create(mockAbTest);

      const updateData = {
        name: 'Updated Test',
        description: 'Updated Description',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/ab-tests/${test._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test');
      expect(response.body.data.description).toBe('Updated Description');
    });

    it('should delete A/B test', async () => {
      const test = await abTestModel.create(mockAbTest);

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/ab-tests/${test._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('A/B test deleted successfully');

      // Verify test is deleted
      const deletedTest = await abTestModel.findById(test._id);
      expect(deletedTest).toBeNull();
    });
  });

  describe('A/B Test Lifecycle Operations', () => {
    it('should start A/B test', async () => {
      const test = await abTestModel.create(mockAbTest);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/ab-tests/${test._id}/start`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.startedAt).toBeDefined();
    });

    it('should stop A/B test', async () => {
      const activeTest = { ...mockAbTest, status: 'active' };
      const test = await abTestModel.create(activeTest);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/ab-tests/${test._id}/stop`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completedAt).toBeDefined();
    });
  });

  describe('Participant Management', () => {
    it('should enroll participant in A/B test', async () => {
      const activeTest = { ...mockAbTest, status: 'active' };
      const test = await abTestModel.create(activeTest);

      const enrollmentData = {
        userId: 'user123',
        testId: (test._id as any).toString(),
        variationId: 'control',
        metadata: { source: 'test' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/ab-tests/enroll')
        .send(enrollmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('user123');
      expect(response.body.data.testId).toBe((test._id as any).toString());
      expect(response.body.data.variationId).toBe('control');
      expect(response.body.data.status).toBe('enrolled');
    });

    it('should expose participant to A/B test', async () => {
      const activeTest = { ...mockAbTest, status: 'active' };
      const test = await abTestModel.create(activeTest);
      const participant = await participantModel.create({
        ...mockParticipant,
        testId: test._id,
        status: 'enrolled',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/ab-tests/expose')
        .send({
          testId: (test._id as any).toString(),
          userId: 'user123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('exposed');
      expect(response.body.data.exposedAt).toBeDefined();
    });

    it('should record participant interaction', async () => {
      const activeTest = { ...mockAbTest, status: 'active' };
      const test = await abTestModel.create(activeTest);
      const participant = await participantModel.create({
        ...mockParticipant,
        testId: test._id,
        status: 'exposed',
      });

      const interactionData = {
        userId: 'user123',
        testId: (test._id as any).toString(),
        interactionType: 'click',
        metadata: { element: 'button' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/ab-tests/interaction')
        .send(interactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.interactions).toHaveLength(1);
      expect(response.body.data.interactions[0].type).toBe('click');
    });

    it('should record participant conversion', async () => {
      const activeTest = { ...mockAbTest, status: 'active' };
      const test = await abTestModel.create(activeTest);
      const participant = await participantModel.create({
        ...mockParticipant,
        testId: test._id,
        status: 'exposed',
      });

      const conversionData = {
        userId: 'user123',
        testId: (test._id as any).toString(),
        metricName: 'click_rate',
        value: 0.15,
        metadata: { source: 'email' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/ab-tests/conversion')
        .send(conversionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('converted');
      expect(response.body.data.conversions).toHaveLength(1);
      expect(response.body.data.conversions[0].metricName).toBe('click_rate');
      expect(response.body.data.conversions[0].value).toBe(0.15);
    });
  });

  describe('Test Results and Statistics', () => {
    it('should get A/B test results', async () => {
      const test = await abTestModel.create(mockAbTest);

      // Mock test results
      const mockResults = {
        totalParticipants: 100,
        controlGroup: {
          participants: 50,
          conversions: 10,
          conversionRate: 0.2,
          metrics: { avgInteractions: 2.5 },
        },
        variants: [
          {
            variationId: 'variant1',
            participants: 50,
            conversions: 15,
            conversionRate: 0.3,
            metrics: { avgInteractions: 3.0 },
            significance: 0.95,
            confidenceInterval: { lower: 0.25, upper: 0.35 },
            isWinner: true,
          },
        ],
      };

      // Mock the repository method
      const abTestService = app.get('AbTestService');
      jest.spyOn(abTestService, 'getTestResults').mockResolvedValue({
        testId: (test._id as any).toString(),
        testName: 'Test A/B Test',
        status: 'active',
        totalParticipants: 100,
        controlGroup: mockResults.controlGroup,
        variants: mockResults.variants,
        statisticalSignificance: true,
        winner: 'variant1',
        recommendations: ['Test needs more participants to reach statistical significance'],
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/ab-tests/${test._id}/results`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testId).toBe((test._id as any).toString());
      expect(response.body.data.testName).toBe('Test A/B Test');
      expect(response.body.data.statisticalSignificance).toBe(true);
      expect(response.body.data.winner).toBe('variant1');
    });

    it('should get A/B test statistics', async () => {
      const test = await abTestModel.create(mockAbTest);

      // Mock test statistics
      const mockStatistics = {
        totalParticipants: 100,
        enrollmentRate: 0.8,
        exposureRate: 0.75,
        conversionRate: 0.2,
        dropOffRate: 0.05,
        byVariation: {
          control: {
            participants: 50,
            exposed: 40,
            converted: 8,
            exposureRate: 0.8,
            conversionRate: 0.2,
          },
          variant1: {
            participants: 50,
            exposed: 35,
            converted: 12,
            exposureRate: 0.7,
            conversionRate: 0.34,
          },
        },
        byStatus: {
          enrolled: 20,
          exposed: 75,
          converted: 20,
          dropped: 5,
        },
        trends: {
          enrollment: [],
          exposure: [],
          conversion: [],
        },
      };

      // Mock the repository method
      const abTestService = app.get('AbTestService');
      jest.spyOn(abTestService, 'getTestStatistics').mockResolvedValue(mockStatistics);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/ab-tests/${test._id}/statistics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalParticipants).toBe(100);
      expect(response.body.data.enrollmentRate).toBe(0.8);
      expect(response.body.data.conversionRate).toBe(0.2);
    });
  });

  describe('User-Specific Operations', () => {
    it('should get eligible A/B tests for user', async () => {
      const activeTest = { ...mockAbTest, status: 'active' };
      await abTestModel.create(activeTest);

      const response = await request(app.getHttpServer())
        .get('/api/v1/ab-tests/eligible')
        .query({
          userId: 'user123',
          userSegments: 'premium',
          categories: 'news',
          channels: 'email',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should get A/B tests for user', async () => {
      const test = await abTestModel.create(mockAbTest);
      await participantModel.create({
        ...mockParticipant,
        testId: test._id,
        userId: 'user123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/ab-tests/user/user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup completed A/B tests', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ab-tests/cleanup')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent A/B test', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ab-tests/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get A/B test');
    });

    it('should return 400 for invalid test data', async () => {
      const invalidTestData = {
        name: '',
        testType: 'content',
        variations: [],
        targetAudience: {},
        duration: {
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-01-31').toISOString(),
        },
        successMetrics: {
          primary: 'click_rate',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/ab-tests')
        .send(invalidTestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create A/B test');
    });

    it('should return 400 for starting non-draft test', async () => {
      const activeTest = { ...mockAbTest, status: 'active' };
      const test = await abTestModel.create(activeTest);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/ab-tests/${test._id}/start`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to start A/B test');
    });

    it('should return 400 for stopping non-active test', async () => {
      const test = await abTestModel.create(mockAbTest);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/ab-tests/${test._id}/stop`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to stop A/B test');
    });
  });
});
