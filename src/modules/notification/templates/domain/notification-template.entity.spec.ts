import { NotificationTemplate } from './notification-template.entity';
import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';
import { Body } from '@nestjs/common';
import { Type } from 'class-transformer';

describe('NotificationTemplate', () => {
  const validProps = {
    name: 'test_template',
    type: NotificationType.PAYMENT,
    channel: NotificationChannel.PUSH,
    subject: 'Payment Notification',
    body: 'Payment successful {{amount}} VND for order #{{order_id}}',
    language: 'vi',
    variables: ['amount', 'order_id'],
    isActive: true,
    createdBy: 'user_123',
  };

  describe('create', () => {
    it('should create a template with valid props', () => {
      const template = NotificationTemplate.create(validProps);

      expect(template).toBeDefined();
      expect(template.name).toBe(validProps.name);
      expect(template.type).toBe(validProps.type);
      expect(template.channel).toBe(validProps.channel);
      expect(template.body).toBe(validProps.body);
      expect(template.language).toBe(validProps.language);
      expect(template.variables).toEqual(validProps.variables);
      expect(template.isActive).toBe(validProps.isActive);
      expect(template.createdBy).toBe(validProps.createdBy);
      expect(template.id).toBeDefined();
      expect(template.createdAt).toBeDefined();
      expect(template.updatedAt).toBeDefined();
    });

    it('should create unique templates', () => {
      const template1 = NotificationTemplate.create(validProps);
      const template2 = NotificationTemplate.create(validProps);

      expect(template1.id).not.toBe(template2.id);
    });

    it('should default isActive to true', () => {
      const { isActive, ...propsWithoutActive } = validProps;

      const template = NotificationTemplate.create(propsWithoutActive as any);
      expect(template.isActive).toBe(true);
    });
  });

  describe('fromPersistence', () => {
    it('should create template from persistence data', () => {
      const persistenceData = {
        id: 'tpl_123',
        ...validProps,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      };

      const template = NotificationTemplate.fromPersistence(persistenceData);

      expect(template.id).toBe(persistenceData.id);
      expect(template.name).toBe(persistenceData.name);
      expect(template.createdAt).toEqual(persistenceData.createdAt);
      expect(template.updatedAt).toEqual(persistenceData.updatedAt);
    });
  });

  describe('updateContent', () => {
    let template: NotificationTemplate;

    beforeEach(() => {
      template = NotificationTemplate.create(validProps);
    });

    it('should update template content', () => {
      const updates = {
        name: 'updated_template',
        subject: 'Updated Payment Notification',
        body: 'Updated body {{new_var}}',
        variables: ['new_var'],
      };

      template.updateContent(updates);

      expect(template.name).toBe(updates.name);
      expect(template.body).toBe(updates.body);
      expect(template.variables).toEqual(updates.variables);
    });

    it('should update isActive status', () => {
      template.updateContent({ subject: 'Payment Notification', isActive: false });
      expect(template.isActive).toBe(false);

      template.updateContent({ subject: 'Payment Notification', isActive: true });
      expect(template.isActive).toBe(true);
    });
  });

  describe('activate/deactivate', () => {
    let template: NotificationTemplate;

    beforeEach(() => {
      template = NotificationTemplate.create(validProps);
    });

    it('should activate template', () => {
      template.deactivate();
      expect(template.isActive).toBe(false);

      template.activate();
      expect(template.isActive).toBe(true);
    });

    it('should deactivate template', () => {
      template.deactivate();
      expect(template.isActive).toBe(false);
    });
  });

  describe('extractVariablesFromBody', () => {
    it('should extract variables from body', () => {
      const template = NotificationTemplate.create({
        ...validProps,
        body: 'Hello {{name}}, your order {{order_id}} is ready!',
      });

      const variables = template.extractVariablesFromBody();
      expect(variables).toEqual(['name', 'order_id']);
    });

    it('should extract variables from subject and body', () => {
      const template = NotificationTemplate.create({
        ...validProps,
        subject: 'Order {{order_id}} update',
        body: 'Hello {{name}}, your order is ready!',
      });

      const variables = template.extractVariablesFromBody();
      expect(variables).toEqual(['name', 'order_id']);
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const template = NotificationTemplate.create(validProps);
      const validation = template.validateTemplate();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing variables', () => {
      const template = NotificationTemplate.create({
        ...validProps,
        body: 'Hello {{name}}!',
        variables: [], // No variables declared
      });

      const validation = template.validateTemplate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Variable 'name' is used in template but not declared");
    });

    it('should detect unused variables', () => {
      const template = NotificationTemplate.create({
        ...validProps,
        body: 'Hello world!',
        variables: ['unused_var'], // Variable declared but not used
      });

      const validation = template.validateTemplate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Variable 'unused_var' is declared but not used in template",
      );
    });
  });
});
