import { Injectable, Logger } from '@nestjs/common';
// import { NovuWorkflowService } from '../../../infrastructure/external/novu/novu-workflow.service';
// import { CircuitBreakerService } from '../../../infrastructure/external/circuit-breaker/circuit-breaker.service';
// import { ErrorClassifierService } from '../../../common/services/error-classifier.service';

@Injectable()
export class NotificationProcessingService {
  private readonly logger = new Logger(NotificationProcessingService.name);

  constructor() // private readonly circuitBreakerService: CircuitBreakerService, // private readonly novuWorkflowService: NovuWorkflowService,
  // private readonly errorClassifierService: ErrorClassifierService,
  {}

  async processNotification(notificationData: any): Promise<any> {
    try {
      this.logger.log('Processing notification', { notificationId: notificationData.id });

      // Process notification logic here
      // const result = await this.novuWorkflowService.triggerWorkflow(
      //   notificationData.workflowId,
      //   notificationData.data,
      // );
      const result = { success: true, message: 'Notification processed' };

      this.logger.log('Notification processed successfully', {
        notificationId: notificationData.id,
        result,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to process notification', error);
      throw error;
    }
  }
}
