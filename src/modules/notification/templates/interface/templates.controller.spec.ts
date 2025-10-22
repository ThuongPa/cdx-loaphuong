import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from './templates.controller';
import { NotificationTemplateRepository } from '../domain/notification-template.repository';
import { TemplateRendererService } from '../domain/services/template-renderer.service';
import { NotificationTemplateFactory } from '../domain/notification-template.factory';
import { NotFoundException, BadRequestException, Controller, Body, Res } from '@nestjs/common';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let templateRepository: any;
  let templateRenderer: any;
  let templateFactory: any;

  beforeEach(async () => {
    const mockTemplateRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      existsByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    };

    const mockTemplateRenderer = {
      renderTemplate: jest.fn(),
      previewTemplate: jest.fn(),
      validateTemplateSyntax: jest.fn(),
    };

    const mockTemplateFactory = {
      createTemplate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        {
          provide: 'NotificationTemplateRepository',
          useValue: mockTemplateRepository,
        },
        {
          provide: TemplateRendererService,
          useValue: mockTemplateRenderer,
        },
        {
          provide: NotificationTemplateFactory,
          useValue: mockTemplateFactory,
        },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
    templateRepository = mockTemplateRepository;
    templateRenderer = mockTemplateRenderer;
    templateFactory = mockTemplateFactory;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a template', async () => {
      const createDto = {
        name: 'Test Template',
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.EMAIL,
        subject: 'Test Subject',
        body: 'Test Body',
        language: 'en',
        variables: [],
        isActive: true,
        createdBy: 'system',
      };

      const mockTemplate = { id: '1', ...createDto };
      templateRepository.findByName.mockResolvedValue(null);
      templateFactory.createTemplate.mockReturnValue(mockTemplate);
      templateRepository.create.mockResolvedValue(mockTemplate);

      const result = await controller.create(createDto, { id: 'user123' } as any);

      expect(result).toEqual(mockTemplate);
      expect(templateRepository.findByName).toHaveBeenCalledWith(createDto.name);
      expect(templateFactory.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          createdBy: 'user123',
        }),
      );
      expect(templateRepository.create).toHaveBeenCalledWith(mockTemplate);
    });
  });

  describe('findOne', () => {
    it('should return a template', async () => {
      const mockTemplate = { id: '1', name: 'Test Template' };
      templateRepository.findById.mockResolvedValue(mockTemplate);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockTemplate);
      expect(templateRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when template not found', async () => {
      templateRepository.findById.mockRejectedValue(new NotFoundException('Template not found'));

      await expect(controller.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a template', async () => {
      const updateDto = { name: 'Updated Template' };
      const mockTemplate = { id: '1', ...updateDto };
      templateRepository.findById.mockResolvedValue(mockTemplate);
      templateRepository.existsByName.mockResolvedValue(false);
      templateRepository.update.mockResolvedValue(mockTemplate);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(mockTemplate);
      expect(templateRepository.update).toHaveBeenCalledWith('1', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a template', async () => {
      const mockTemplate = { id: '1', name: 'Test Template' };
      templateRepository.findById.mockResolvedValue(mockTemplate);
      templateRepository.delete.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(templateRepository.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('preview', () => {
    it('should preview a template', async () => {
      const mockTemplate = { id: '1', name: 'Test Template', body: 'Hello {{test}}' };
      const mockRendered = {
        subject: 'Hello data',
        body: 'Hello data',
        variables: { test: 'data' },
      };

      templateRepository.findById.mockResolvedValue(mockTemplate);
      templateRenderer.previewTemplate.mockReturnValue(mockRendered);

      const result = await controller.preview('1', { test: 'data' });

      expect(result).toEqual(mockRendered);
      expect(templateRenderer.previewTemplate).toHaveBeenCalledWith(mockTemplate.body, {
        test: 'data',
      });
    });
  });

  describe('validate', () => {
    it('should validate a template', async () => {
      const createDto = {
        name: 'Test Template',
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.EMAIL,
        subject: 'Test Subject',
        body: 'Test Body',
        language: 'en',
        variables: [],
        isActive: true,
        createdBy: 'system',
      };
      const mockTemplate = { id: '1', ...createDto };
      const mockValidation = { isValid: true, errors: [], warnings: [] };

      templateFactory.createTemplate.mockReturnValue(mockTemplate);
      templateRenderer.validateTemplateSyntax.mockReturnValue(mockValidation);

      const result = await controller.validateTemplate(createDto);

      expect(result).toEqual(mockValidation);
      expect(templateFactory.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          createdBy: 'validation',
        }),
      );
      expect(templateRenderer.validateTemplateSyntax).toHaveBeenCalledWith(mockTemplate.body);
    });
  });
});
