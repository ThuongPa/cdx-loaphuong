import { Injectable } from '@nestjs/common';
import { NotificationTemplate } from '../notification-template.entity';

export interface RenderedTemplate {
  subject?: string;
  body: string;
  variables: string[];
  language: string;
  channel: string;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class TemplateRendererService {
  renderTemplate(template: NotificationTemplate, variables: Record<string, any>): RenderedTemplate {
    const renderedBody = this.renderText(template.body, variables);
    const renderedSubject = template.subject
      ? this.renderText(template.subject, variables)
      : undefined;

    return {
      subject: renderedSubject,
      body: renderedBody,
      variables: template.variables,
      language: template.language,
      channel: template.channel,
    };
  }

  previewTemplate(
    template: string,
    variables: Record<string, any>,
  ): { subject: string; body: string } {
    const rendered = this.renderText(template, variables);
    return {
      subject: rendered,
      body: rendered,
    };
  }

  validateTemplateSyntax(template: string): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for balanced braces
      const openBraces = (template.match(/\{\{/g) || []).length;
      const closeBraces = (template.match(/\}\}/g) || []).length;

      if (openBraces !== closeBraces) {
        errors.push('Unbalanced template braces');
      }

      // Check for valid variable syntax
      const variableRegex = /\{\{(\w+)\}\}/g;
      const variables: string[] = [];
      let match;

      while ((match = variableRegex.exec(template)) !== null) {
        const variable = match[1];
        if (!variables.includes(variable)) {
          variables.push(variable);
        }
      }

      // Check for unused variables (warnings)
      const declaredVariables = this.extractVariablesFromText(template);
      for (const variable of declaredVariables) {
        if (!variables.includes(variable)) {
          warnings.push(`Variable '${variable}' is declared but not used`);
        }
      }

      // Check for undeclared variables (errors)
      for (const variable of variables) {
        if (!declaredVariables.includes(variable)) {
          errors.push(`Variable '${variable}' is used but not declared`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid template syntax'],
        warnings: [],
      };
    }
  }

  extractVariablesFromText(text: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  private renderText(template: string, variables: Record<string, any>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const replacement = value !== null && value !== undefined ? String(value) : '';
      rendered = rendered.replace(new RegExp(placeholder, 'g'), replacement);
    }

    return rendered;
  }
}
