import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { NovuRetryService } from './novu-retry.service';

@Injectable()
export class NovuClient {
  private readonly logger = new Logger(NovuClient.name);

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly retryService: NovuRetryService,
    private readonly configService: ConfigService,
  ) {}

  async createSubscriber(data: any): Promise<void> {
    this.logger.log(`Creating subscriber: ${data.subscriberId}`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Real Novu API implementation
          const novuConfig = this.configService.get('novu');
          const apiKey = novuConfig.apiKey;
          const apiUrl = novuConfig.apiUrl;

          if (!apiKey) {
            this.logger.warn('NOVU_API_KEY not configured, using mock implementation');
            return Promise.resolve();
          }

          try {
            const response = await fetch(`${apiUrl}/v1/subscribers`, {
              method: 'POST',
              headers: {
                Authorization: `ApiKey ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscriberId: data.subscriberId,
                email: data.email,
                phone: data.phone,
                firstName: data.firstName,
                lastName: data.lastName,
                data: data.data,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Novu API error: ${response.status} - ${errorText}`);
            }

            this.logger.log(`Subscriber created successfully in Novu: ${data.subscriberId}`);
            return Promise.resolve();
          } catch (error) {
            this.logger.error(`Failed to create subscriber in Novu: ${error.message}`);
            throw error;
          }
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async updateSubscriber(subscriberId: string, data: any): Promise<void> {
    this.logger.log(`Updating subscriber: ${subscriberId}`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Real Novu API implementation
          const novuConfig = this.configService.get('novu');
          const apiKey = novuConfig.apiKey;
          const apiUrl = novuConfig.apiUrl;

          if (!apiKey) {
            this.logger.warn('NOVU_API_KEY not configured, using mock implementation');
            return Promise.resolve();
          }

          try {
            const response = await fetch(`${apiUrl}/v1/subscribers/${subscriberId}`, {
              method: 'PUT',
              headers: {
                Authorization: `ApiKey ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: data.email,
                phone: data.phone,
                firstName: data.firstName,
                lastName: data.lastName,
                data: data.data,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Novu API error: ${response.status} - ${errorText}`);
            }

            this.logger.log(`Subscriber updated successfully in Novu: ${subscriberId}`);
            return Promise.resolve();
          } catch (error) {
            this.logger.error(`Failed to update subscriber in Novu: ${error.message}`);
            throw error;
          }
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async getSubscriber(subscriberId: string): Promise<any> {
    this.logger.log(`Getting subscriber: ${subscriberId}`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Mock implementation - in real app, this would call Novu API
          // For testing, we'll return null to simulate subscriber not found
          return Promise.resolve(null);
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async deleteSubscriber(subscriberId: string): Promise<void> {
    this.logger.log(`Deleting subscriber: ${subscriberId}`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Mock implementation - in real app, this would call Novu API
          return Promise.resolve();
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async createTemplate(data: any): Promise<string> {
    this.logger.log(`Creating template: ${data.name}`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Mock implementation - in real app, this would call Novu API
          return Promise.resolve('mock-template-id');
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async updateTemplate(templateId: string, data: any): Promise<void> {
    this.logger.log(`Updating template: ${templateId}`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Mock implementation - in real app, this would call Novu API
          return Promise.resolve();
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async deleteTemplate(templateId: string): Promise<void> {
    this.logger.log(`Deleting template: ${templateId}`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Mock implementation - in real app, this would call Novu API
          return Promise.resolve();
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async getTemplate(templateId: string): Promise<any> {
    this.logger.log(`Getting template: ${templateId}`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Mock implementation - in real app, this would call Novu API
          return Promise.resolve({ id: templateId, name: 'Mock Template' });
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async listTemplates(): Promise<any[]> {
    this.logger.log(`Listing templates`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Mock implementation - in real app, this would call Novu API
          return Promise.resolve([]);
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async sendNotification(data: any): Promise<void> {
    this.logger.log(`Sending notification: ${data.to}`);

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Mock implementation - in real app, this would call Novu API
          return Promise.resolve();
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }

  async triggerWorkflow(data: {
    workflowId: string;
    recipients: string[];
    payload: Record<string, any>;
  }): Promise<{ deliveryId: string }> {
    this.logger.log(
      `Triggering workflow: ${data.workflowId} for ${data.recipients.length} recipients`,
    );

    return this.circuitBreakerService.execute(
      'novu',
      async () => {
        return this.retryService.executeWithRetry(async () => {
          // Mock implementation - in real app, this would call Novu API
          return Promise.resolve({ deliveryId: `delivery_${Date.now()}` });
        });
      },
      {
        failureThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
      },
    );
  }
}
