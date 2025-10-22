import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';

import { TemplatesModule } from '../../../src/modules/notification/templates/templates.module';
import { TemplateSelectionService } from '../../../src/modules/notification/templates/application/services/template-selection.service';
import { NotificationTemplateRepository } from '../../../src/modules/notification/templates/domain/notification-template.repository';
import { NotificationTemplateFactory } from '../../../src/modules/notification/templates/domain/notification-template.factory';
import {
  NotificationType,
  NotificationChannel,
} from '../../../src/common/types/notification.types';

describe('Template Selection Integration Tests', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;
  let templateSelectionService: TemplateSelectionService;
  let templateRepository: NotificationTemplateRepository;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(mongoUri),
        TemplatesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get services
    templateSelectionService = moduleFixture.get<TemplateSelectionService>(
      'TemplateSelectionService',
    );
    templateRepository = moduleFixture.get<NotificationTemplateRepository>(
      'NotificationTemplateRepository',
    );

    // Connect to MongoDB
    mongoConnection = (await connect(mongoUri)).connection;
  });

  afterAll(async () => {
    await mongoConnection.db?.dropDatabase();
    await mongoConnection.close();
    await mongoServer.stop();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await mongoConnection.db?.dropDatabase();
  });

  describe('Template Selection and Rendering', () => {
    beforeEach(async () => {
      // Create test templates
      const templates = [
        NotificationTemplateFactory.create({
          name: 'payment_push_vi',
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.PUSH,
          body: 'Thanh toán thành công {{amount}} VND cho đơn hàng #{{order_id}}',
          language: 'vi',
          variables: ['amount', 'order_id'],
          isActive: true,
          createdBy: 'user_123',
        }),
        NotificationTemplateFactory.create({
          name: 'payment_push_en',
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.PUSH,
          body: 'Payment successful {{amount}} VND for order #{{order_id}}',
          language: 'en',
          variables: ['amount', 'order_id'],
          isActive: true,
          createdBy: 'user_123',
        }),
        NotificationTemplateFactory.create({
          name: 'payment_email_vi',
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.EMAIL,
          subject: 'Thanh toán thành công - Đơn hàng #{{order_id}}',
          body: '<h2>Thanh toán thành công!</h2><p>Bạn đã thanh toán thành công <strong>{{amount}} VND</strong> cho đơn hàng <strong>#{{order_id}}</strong>.</p>',
          language: 'vi',
          variables: ['amount', 'order_id'],
          isActive: true,
          createdBy: 'user_123',
        }),
        NotificationTemplateFactory.create({
          name: 'booking_push_vi',
          type: NotificationType.BOOKING,
          channel: NotificationChannel.PUSH,
          body: 'Đặt lịch thành công! Lịch hẹn: {{appointment_date}} tại {{location}}',
          language: 'vi',
          variables: ['appointment_date', 'location'],
          isActive: true,
          createdBy: 'user_123',
        }),
      ];

      for (const template of templates) {
        await templateRepository.save(template);
      }
    });

    it('should select and render template with exact language match', async () => {
      const context = {
        amount: '150.00',
        order_id: 'ORD-12345',
      };

      const result = await templateSelectionService.selectAndRenderTemplate(
        {
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.PUSH,
          language: 'vi',
        },
        context,
      );

      expect(result.body).toBe('Thanh toán thành công 150.00 VND cho đơn hàng #ORD-12345');
      expect(result.language).toBe('vi');
      expect(result.templateName).toBe('payment_push_vi');
    });

    it('should fallback to default language when requested language not found', async () => {
      const context = {
        amount: '150.00',
        order_id: 'ORD-12345',
      };

      const result = await templateSelectionService.selectAndRenderTemplate(
        {
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.PUSH,
          language: 'fr', // French not available
          fallbackLanguage: 'vi',
        },
        context,
      );

      expect(result.body).toBe('Thanh toán thành công 150.00 VND cho đơn hàng #ORD-12345');
      expect(result.language).toBe('vi');
      expect(result.templateName).toBe('payment_push_vi');
    });

    it('should fallback to Vietnamese when no fallback language specified', async () => {
      const context = {
        amount: '150.00',
        order_id: 'ORD-12345',
      };

      const result = await templateSelectionService.selectAndRenderTemplate(
        {
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.PUSH,
          language: 'fr', // French not available
        },
        context,
      );

      expect(result.body).toBe('Thanh toán thành công 150.00 VND cho đơn hàng #ORD-12345');
      expect(result.language).toBe('vi');
    });

    it('should render email template with subject', async () => {
      const context = {
        amount: '150.00',
        order_id: 'ORD-12345',
      };

      const result = await templateSelectionService.selectAndRenderTemplate(
        {
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.EMAIL,
          language: 'vi',
        },
        context,
      );

      expect(result.subject).toBe('Thanh toán thành công - Đơn hàng #ORD-12345');
      expect(result.body).toContain('Thanh toán thành công!');
      expect(result.body).toContain('150.00 VND');
      expect(result.body).toContain('ORD-12345');
      expect(result.channel).toBe(NotificationChannel.EMAIL);
    });

    it('should throw error when no template found for type and channel', async () => {
      const context = {
        amount: '150.00',
        order_id: 'ORD-12345',
      };

      await expect(
        templateSelectionService.selectAndRenderTemplate(
          {
            type: NotificationType.EMERGENCY, // No emergency templates created
            channel: NotificationChannel.PUSH,
            language: 'vi',
          },
          context,
        ),
      ).rejects.toThrow('No template found for type: emergency, channel: push, language: vi');
    });

    it('should throw error when required variables are missing', async () => {
      const context = {
        amount: '150.00',
        // missing order_id
      };

      await expect(
        templateSelectionService.selectAndRenderTemplate(
          {
            type: NotificationType.PAYMENT,
            channel: NotificationChannel.PUSH,
            language: 'vi',
          },
          context,
        ),
      ).rejects.toThrow("Required variable 'order_id' is missing from context");
    });
  });

  describe('Template Availability and Fallback Chain', () => {
    beforeEach(async () => {
      // Create templates with different languages
      const templates = [
        NotificationTemplateFactory.create({
          name: 'payment_push_vi',
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.PUSH,
          body: 'Thanh toán thành công {{amount}} VND',
          language: 'vi',
          variables: ['amount'],
          isActive: true,
          createdBy: 'user_123',
        }),
        NotificationTemplateFactory.create({
          name: 'payment_push_en',
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.PUSH,
          body: 'Payment successful {{amount}} VND',
          language: 'en',
          variables: ['amount'],
          isActive: true,
          createdBy: 'user_123',
        }),
      ];

      for (const template of templates) {
        await templateRepository.save(template);
      }
    });

    it('should check template availability', async () => {
      const hasViTemplate = await templateSelectionService.hasTemplate({
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.PUSH,
        language: 'vi',
      });
      expect(hasViTemplate).toBe(true);

      const hasEnTemplate = await templateSelectionService.hasTemplate({
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.PUSH,
        language: 'en',
      });
      expect(hasEnTemplate).toBe(true);

      const hasFrTemplate = await templateSelectionService.hasTemplate({
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.PUSH,
        language: 'fr',
      });
      expect(hasFrTemplate).toBe(false);
    });

    it('should get available templates for type and channel', async () => {
      const availableTemplates = await templateSelectionService.getAvailableTemplates(
        NotificationType.PAYMENT,
        NotificationChannel.PUSH,
      );

      expect(availableTemplates).toHaveLength(2);
      expect(availableTemplates.map((t) => t.language)).toContain('vi');
      expect(availableTemplates.map((t) => t.language)).toContain('en');
      expect(availableTemplates.every((t) => t.templateName.startsWith('payment_push_'))).toBe(
        true,
      );
    });

    it('should generate correct fallback chain', async () => {
      const fallbackChain = await templateSelectionService.getTemplateFallbackChain({
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.PUSH,
        language: 'fr',
        fallbackLanguage: 'en',
      });

      expect(fallbackChain).toEqual(['fr', 'en', 'vi']);
    });

    it('should generate fallback chain without duplicate languages', async () => {
      const fallbackChain = await templateSelectionService.getTemplateFallbackChain({
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.PUSH,
        language: 'vi',
        fallbackLanguage: 'vi',
      });

      expect(fallbackChain).toEqual(['vi']);
    });
  });
});
