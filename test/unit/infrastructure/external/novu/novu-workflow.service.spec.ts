import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NovuWorkflowService } from '../../../../../src/infrastructure/external/novu/novu-workflow.service';
import { NovuClient } from '../../../../../src/infrastructure/external/novu/novu.client';
import { CircuitBreakerService } from '../../../../../src/infrastructure/external/circuit-breaker/circuit-breaker.service';

describe('NovuWorkflowService', () => {
  let service: NovuWorkflowService;
  let novuClient: jest.Mocked<NovuClient>;
  let configService: jest.Mocked<ConfigService>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;

  beforeEach(async () => {
    const mockNovuClient = {
      createTemplate: jest.fn(),
      sendNotification: jest.fn(),
      getTemplate: jest.fn(),
      listTemplates: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      triggerWorkflow: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue({
        applicationIdentifier: 'test-app',
      }),
    };

    const mockCircuitBreakerService = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NovuWorkflowService,
        {
          provide: NovuClient,
          useValue: mockNovuClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
      ],
    }).compile();

    service = module.get<NovuWorkflowService>(NovuWorkflowService);
    novuClient = module.get(NovuClient);
    configService = module.get(ConfigService);
    circuitBreakerService = module.get(CircuitBreakerService);
  });

  describe('createPushWorkflow', () => {
    it('should create push workflow successfully', async () => {
      const mockTemplateId = 'template_123';
      novuClient.createTemplate.mockResolvedValue(mockTemplateId);

      const result = await service.createPushWorkflow();

      expect(result).toBe(mockTemplateId);
      expect(novuClient.createTemplate).toHaveBeenCalledWith({
        name: 'Push Notification Workflow',
        type: 'push',
        channel: 'push',
        body: 'Hello {{firstName}}! {{message}}',
        variables: ['firstName', 'message'],
      });
    });
  });

  describe('createInAppWorkflow', () => {
    it('should create in-app workflow successfully', async () => {
      const mockTemplateId = 'template_456';
      novuClient.createTemplate.mockResolvedValue(mockTemplateId);

      const result = await service.createInAppWorkflow();

      expect(result).toBe(mockTemplateId);
      expect(novuClient.createTemplate).toHaveBeenCalledWith({
        name: 'In-App Notification Workflow',
        type: 'in-app',
        channel: 'in-app',
        body: '{{title}}\n\n{{message}}\n\n{{actionUrl}}',
        variables: ['title', 'message', 'actionUrl'],
      });
    });
  });

  describe('createEmailWorkflow', () => {
    it('should create email workflow successfully', async () => {
      const mockTemplateId = 'template_789';
      novuClient.createTemplate.mockResolvedValue(mockTemplateId);

      const result = await service.createEmailWorkflow();

      expect(result).toBe(mockTemplateId);
      expect(novuClient.createTemplate).toHaveBeenCalledWith({
        name: 'Email Notification Workflow',
        type: 'email',
        channel: 'email',
        subject: '{{subject}}',
        body: `
        <html>
          <body>
            <h1>{{title}}</h1>
            <p>{{message}}</p>
            <a href="{{actionUrl}}">Click here</a>
          </body>
        </html>
      `,
        variables: ['subject', 'title', 'message', 'actionUrl'],
      });
    });
  });

  describe('triggerNotification', () => {
    it('should trigger notification successfully', async () => {
      novuClient.sendNotification.mockResolvedValue(undefined);

      await service.triggerNotification({
        templateId: 'template_123',
        recipient: 'user123',
        data: { firstName: 'John', message: 'Hello!' },
        channel: 'push',
      });

      expect(novuClient.sendNotification).toHaveBeenCalledWith({
        templateId: 'template_123',
        recipient: 'user123',
        data: { firstName: 'John', message: 'Hello!' },
        channel: 'push',
      });
    });
  });

  describe('setupDefaultWorkflows', () => {
    it('should setup all default workflows', async () => {
      novuClient.createTemplate.mockResolvedValue('template_id');

      await service.setupDefaultWorkflows();

      expect(novuClient.createTemplate).toHaveBeenCalledTimes(3);
    });
  });

  describe('getWorkflowTemplate', () => {
    it('should get workflow template successfully', async () => {
      const mockTemplate = { id: 'template_123', name: 'Test Template' };
      novuClient.getTemplate.mockResolvedValue(mockTemplate);

      const result = await service.getWorkflowTemplate('template_123');

      expect(result).toEqual(mockTemplate);
      expect(novuClient.getTemplate).toHaveBeenCalledWith('template_123');
    });
  });

  describe('listWorkflowTemplates', () => {
    it('should list workflow templates successfully', async () => {
      const mockTemplates = [
        { id: 'template_1', name: 'Template 1' },
        { id: 'template_2', name: 'Template 2' },
      ];
      novuClient.listTemplates.mockResolvedValue(mockTemplates);

      const result = await service.listWorkflowTemplates();

      expect(result).toEqual(mockTemplates);
      expect(novuClient.listTemplates).toHaveBeenCalled();
    });
  });

  describe('updateWorkflowTemplate', () => {
    it('should update workflow template successfully', async () => {
      const templateId = 'template_123';
      const templateData = { name: 'Updated Template' };

      await service.updateWorkflowTemplate(templateId, templateData);

      expect(novuClient.updateTemplate).toHaveBeenCalledWith(templateId, templateData);
    });
  });

  describe('deleteWorkflowTemplate', () => {
    it('should delete workflow template successfully', async () => {
      const templateId = 'template_123';

      await service.deleteWorkflowTemplate(templateId);

      expect(novuClient.deleteTemplate).toHaveBeenCalledWith(templateId);
    });
  });
});
