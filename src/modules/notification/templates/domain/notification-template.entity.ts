import { NotificationType, NotificationChannel } from '../../../../common/types/notification.types';
import { Get, Body } from '@nestjs/common';
import { Type } from 'class-transformer';

export interface NotificationTemplateProps {
  id: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  body: string;
  language: string;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationTemplate {
  private constructor(private readonly props: NotificationTemplateProps) {}

  static create(
    props: Omit<NotificationTemplateProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): NotificationTemplate {
    const now = new Date();
    const id = this.generateId();

    return new NotificationTemplate({
      ...props,
      isActive: props.isActive ?? true,
      id,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: NotificationTemplateProps): NotificationTemplate {
    return new NotificationTemplate(props);
  }

  private static generateId(): string {
    // Using CUID format as per coding standards
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `tpl_${timestamp}${random}`;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get channel(): NotificationChannel {
    return this.props.channel;
  }

  get subject(): string {
    return this.props.subject;
  }

  get body(): string {
    return this.props.body;
  }

  get language(): string {
    return this.props.language;
  }

  get variables(): string[] {
    return [...this.props.variables];
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  updateContent(updates: {
    name?: string;
    subject: string;
    body?: string;
    variables?: string[];
    isActive?: boolean;
  }): void {
    if (updates.name !== undefined) {
      this.validateName(updates.name);
      this.props.name = updates.name;
    }

    if (updates.subject !== undefined) {
      this.validateSubject(updates.subject);
      this.props.subject = updates.subject;
    }

    if (updates.body !== undefined) {
      this.validateBody(updates.body);
      this.props.body = updates.body;
    }

    if (updates.variables !== undefined) {
      this.validateVariables(updates.variables);
      this.props.variables = [...updates.variables];
    }

    if (updates.isActive !== undefined) {
      this.props.isActive = updates.isActive;
    }

    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  extractVariablesFromBody(): string[] {
    const variables: string[] = [];

    // Extract from body
    const bodyRegex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = bodyRegex.exec(this.props.body)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    // Also check subject for variables
    if (this.props.subject) {
      const subjectRegex = /\{\{(\w+)\}\}/g;
      while ((match = subjectRegex.exec(this.props.subject)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }
    }

    return variables;
  }

  validateTemplate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    this.validateName(this.props.name, errors);

    // Validate body
    this.validateBody(this.props.body, errors);

    // Validate subject if present
    if (this.props.subject) {
      this.validateSubject(this.props.subject, errors);
    }

    // Validate variables consistency
    const extractedVariables = this.extractVariablesFromBody();
    const declaredVariables = this.props.variables;

    // Check if all declared variables are used
    for (const variable of declaredVariables) {
      if (!extractedVariables.includes(variable)) {
        errors.push(`Variable '${variable}' is declared but not used in template`);
      }
    }

    // Check if all used variables are declared
    for (const variable of extractedVariables) {
      if (!declaredVariables.includes(variable)) {
        errors.push(`Variable '${variable}' is used in template but not declared`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateName(name: string, errors?: string[]): void {
    if (!name || name.trim().length === 0) {
      const error = 'Template name is required';
      if (errors) {
        errors.push(error);
      } else {
        throw new Error(error);
      }
    }

    if (name.length > 100) {
      const error = 'Template name must not exceed 100 characters';
      if (errors) {
        errors.push(error);
      } else {
        throw new Error(error);
      }
    }
  }

  private validateBody(body: string, errors?: string[]): void {
    if (!body || body.trim().length === 0) {
      const error = 'Template body is required';
      if (errors) {
        errors.push(error);
      } else {
        throw new Error(error);
      }
    }

    if (body.length > 2000) {
      const error = 'Template body must not exceed 2000 characters';
      if (errors) {
        errors.push(error);
      } else {
        throw new Error(error);
      }
    }
  }

  private validateSubject(subject: string, errors?: string[]): void {
    if (subject && subject.length > 200) {
      const error = 'Template subject must not exceed 200 characters';
      if (errors) {
        errors.push(error);
      } else {
        throw new Error(error);
      }
    }
  }

  private validateVariables(variables: string[]): void {
    if (!Array.isArray(variables)) {
      throw new Error('Variables must be an array');
    }

    for (const variable of variables) {
      if (!variable || typeof variable !== 'string' || variable.trim().length === 0) {
        throw new Error('All variables must be non-empty strings');
      }

      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
        throw new Error(
          `Variable '${variable}' must start with letter or underscore and contain only letters, numbers, and underscores`,
        );
      }
    }
  }

  toPersistence(): NotificationTemplateProps {
    return { ...this.props };
  }
}
