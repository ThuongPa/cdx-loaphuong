import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookRepository } from '../../infrastructure/webhook.repository';
import { Webhook } from '../../domain/webhook.entity';

describe('WebhookService', () => {
  let service: WebhookService;
  let repository: jest.Mocked<WebhookRepository>;

  const mockWebhook = {
    id: '1',
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    events: ['notification.created'],
    headers: { 'Content-Type': 'application/json' },
    secret: 'secret123',
    isActive: true,
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000,
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByName: jest.fn(),
      findByEventType: jest.fn(),
      search: jest.fn(),
      cleanupInactiveWebhooks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: 'WebhookRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    repository = module.get('WebhookRepository');
  });

  describe('createWebhook', () => {
    it('should create a webhook successfully', async () => {
      const createDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        headers: { 'Content-Type': 'application/json' },
        secret: 'secret123',
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
      };

      const webhook = Webhook.create({
        ...createDto,
        isActive: true,
        createdBy: 'user1',
      });
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(webhook);

      const result = await service.createWebhook(createDto, 'user1');

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.url).toBe(createDto.url);
      expect(result.events).toEqual(createDto.events);
      expect(repository.create).toHaveBeenCalledWith(expect.any(Webhook));
    });

    it('should throw ConflictException if webhook name already exists', async () => {
      const createDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
      };

      const existingWebhook = Webhook.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        isActive: true,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user1',
      });
      repository.findByName.mockResolvedValue(existingWebhook);

      await expect(service.createWebhook(createDto, 'user1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if URL is invalid', async () => {
      const createDto = {
        name: 'Test Webhook',
        url: 'invalid-url',
        events: ['notification.created'],
      };

      repository.findByName.mockResolvedValue(null);

      await expect(service.createWebhook(createDto, 'user1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no events provided', async () => {
      const createDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: [],
      };

      repository.findByName.mockResolvedValue(null);

      await expect(service.createWebhook(createDto, 'user1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if invalid event types', async () => {
      const createDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['invalid.event'],
      };

      repository.findByName.mockResolvedValue(null);

      await expect(service.createWebhook(createDto, 'user1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWebhookById', () => {
    it('should return webhook if found', async () => {
      const webhook = Webhook.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        isActive: true,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(webhook);

      const result = await service.getWebhookById('1');

      expect(result).toBe(webhook);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if webhook not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getWebhookById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWebhooks', () => {
    it('should return webhooks with filters', async () => {
      const webhooks = [
        Webhook.create({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['notification.created'],
          isActive: true,
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
          createdBy: 'user1',
        }),
      ];
      repository.find.mockResolvedValue(webhooks);

      const filters = { isActive: true };
      const result = await service.getWebhooks(filters);

      expect(result).toBe(webhooks);
      expect(repository.find).toHaveBeenCalledWith(filters);
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook successfully', async () => {
      const webhook = Webhook.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        isActive: true,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(webhook);
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue(webhook);

      const updateDto = {
        name: 'Updated Webhook',
        url: 'https://example.com/updated-webhook',
      };

      const result = await service.updateWebhook('1', updateDto);

      expect(result).toBe(webhook);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(Webhook));
    });

    it('should throw NotFoundException if webhook not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.updateWebhook('1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if name already exists', async () => {
      const webhook = Webhook.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        isActive: true,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user1',
      });
      const existingWebhook = Webhook.create({
        name: 'Existing Webhook',
        url: 'https://example.com/existing-webhook',
        events: ['notification.created'],
        isActive: true,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user2',
      });
      repository.findById.mockResolvedValue(webhook);
      repository.findByName.mockResolvedValue(existingWebhook);

      const updateDto = { name: 'Existing Webhook' };

      await expect(service.updateWebhook('1', updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      const webhook = Webhook.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        isActive: true,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(webhook);
      repository.delete.mockResolvedValue();

      await service.deleteWebhook('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if webhook not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteWebhook('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWebhooksByEventType', () => {
    it('should return webhooks by event type', async () => {
      const webhooks = [
        Webhook.create({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['notification.created'],
          isActive: true,
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
          createdBy: 'user1',
        }),
      ];
      repository.findByEventType.mockResolvedValue(webhooks);

      const result = await service.getWebhooksByEventType('notification.created');

      expect(result).toBe(webhooks);
      expect(repository.findByEventType).toHaveBeenCalledWith('notification.created');
    });
  });

  describe('getActiveWebhooks', () => {
    it('should return active webhooks', async () => {
      const webhooks = [
        Webhook.create({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['notification.created'],
          isActive: true,
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
          createdBy: 'user1',
        }),
      ];
      repository.find.mockResolvedValue(webhooks);

      const result = await service.getActiveWebhooks();

      expect(result).toBe(webhooks);
      expect(repository.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('activateWebhook', () => {
    it('should activate webhook successfully', async () => {
      const webhook = Webhook.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        isActive: false,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(webhook);
      repository.update.mockResolvedValue(webhook);

      const result = await service.activateWebhook('1');

      expect(result).toBe(webhook);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(Webhook));
    });
  });

  describe('deactivateWebhook', () => {
    it('should deactivate webhook successfully', async () => {
      const webhook = Webhook.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        isActive: true,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(webhook);
      repository.update.mockResolvedValue(webhook);

      const result = await service.deactivateWebhook('1');

      expect(result).toBe(webhook);
      expect(repository.update).toHaveBeenCalledWith('1', expect.any(Webhook));
    });
  });

  describe('getWebhookStatistics', () => {
    it('should return webhook statistics', async () => {
      const webhooks = [
        Webhook.create({
          name: 'Test Webhook 1',
          url: 'https://example.com/webhook1',
          events: ['notification.created'],
          isActive: true,
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
          createdBy: 'user1',
        }),
        Webhook.create({
          name: 'Test Webhook 2',
          url: 'https://example.com/webhook2',
          events: ['notification.sent'],
          isActive: false,
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
          createdBy: 'user1',
        }),
      ];
      repository.find.mockResolvedValue(webhooks);

      const result = await service.getWebhookStatistics();

      expect(result.total).toBe(2);
      expect(result.active).toBe(1);
      expect(result.inactive).toBe(1);
    });
  });

  describe('getWebhooksByUser', () => {
    it('should return webhooks by user', async () => {
      const webhooks = [
        Webhook.create({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['notification.created'],
          isActive: true,
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
          createdBy: 'user1',
        }),
      ];
      repository.find.mockResolvedValue(webhooks);

      const result = await service.getWebhooksByUser('user1');

      expect(result).toBe(webhooks);
      expect(repository.find).toHaveBeenCalledWith({ createdBy: 'user1' });
    });
  });

  describe('searchWebhooks', () => {
    it('should search webhooks', async () => {
      const webhooks = [
        Webhook.create({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['notification.created'],
          isActive: true,
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
          createdBy: 'user1',
        }),
      ];
      repository.search.mockResolvedValue(webhooks);

      const result = await service.searchWebhooks('test');

      expect(result).toBe(webhooks);
      expect(repository.search).toHaveBeenCalledWith('test');
    });
  });

  describe('bulkUpdateWebhooks', () => {
    it('should bulk update webhooks', async () => {
      const webhook = Webhook.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        isActive: true,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(webhook);
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue(webhook);

      const result = await service.bulkUpdateWebhooks(['1'], { name: 'Updated Webhook' });

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('bulkDeleteWebhooks', () => {
    it('should bulk delete webhooks', async () => {
      const webhook = Webhook.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['notification.created'],
        isActive: true,
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
        createdBy: 'user1',
      });
      repository.findById.mockResolvedValue(webhook);
      repository.delete.mockResolvedValue();

      const result = await service.bulkDeleteWebhooks(['1']);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('cleanupInactiveWebhooks', () => {
    it('should cleanup inactive webhooks', async () => {
      repository.cleanupInactiveWebhooks.mockResolvedValue(5);

      const result = await service.cleanupInactiveWebhooks();

      expect(result).toBe(5);
      expect(repository.cleanupInactiveWebhooks).toHaveBeenCalledWith(expect.any(Date));
    });
  });
});
