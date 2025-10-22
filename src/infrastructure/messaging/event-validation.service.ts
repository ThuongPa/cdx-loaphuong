import { validate } from 'class-validator';
import { plainToClass, Type } from 'class-transformer';
import { Injectable, Res, Logger } from '@nestjs/common';

// Define event payload interfaces
interface FeedbackCreatedEventPayload {
  feedbackId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

interface FeedbackSubmittedEventPayload {
  feedbackId: string;
  userId: string;
  submittedAt: Date;
}

interface StatusChangedEventPayload {
  feedbackId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: Date;
}

interface FeedbackAssignedEventPayload {
  feedbackId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: Date;
}

interface AssignmentCreatedEventPayload {
  assignmentId: string;
  feedbackId: string;
  assignedTo: string;
  assignedBy: string;
  createdAt: Date;
}

interface CommentAddedEventPayload {
  commentId: string;
  feedbackId: string;
  userId: string;
  content: string;
  createdAt: Date;
}
// Additional event payload interfaces
interface SLABreachedEventPayload {
  feedbackId: string;
  slaType: string;
  breachedAt: Date;
}

interface SLAWarningEventPayload {
  feedbackId: string;
  slaType: string;
  warningAt: Date;
}

interface FeedbackResolvedEventPayload {
  feedbackId: string;
  resolvedBy: string;
  resolvedAt: Date;
}

interface FeedbackClosedEventPayload {
  feedbackId: string;
  closedBy: string;
  closedAt: Date;
}
// Auth event payload interfaces
interface UserRoleChangedEventPayload {
  userId: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
  changedAt: Date;
}

interface UserUpdatedEventPayload {
  userId: string;
  updatedBy: string;
  updatedAt: Date;
  changes: Record<string, any>;
}

interface UserCreatedEventPayload {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  event?: any;
}

@Injectable()
export class EventValidationService {
  private readonly logger = new Logger(EventValidationService.name);

  async validateEventMessage(message: any): Promise<ValidationResult> {
    try {
      // Check if message has required fields
      if (
        !message.eventId ||
        !message.eventType ||
        !message.aggregateId ||
        !message.aggregateType ||
        !message.timestamp ||
        !message.payload
      ) {
        return {
          isValid: false,
          errors: [
            'Missing required fields: eventId, eventType, aggregateId, aggregateType, timestamp, payload',
          ],
        };
      }

      // Validate event payload based on event type
      const payloadValidation = await this.validateEventPayload(message.eventType, message.payload);

      if (!payloadValidation.isValid) {
        return {
          isValid: false,
          errors: payloadValidation.errors,
        };
      }

      return {
        isValid: true,
        event: message,
      };
    } catch (error) {
      this.logger.error('Event validation error:', error);
      return {
        isValid: false,
        errors: ['Invalid event message format'],
      };
    }
  }

  private async validateEventPayload(eventType: string, payload: any): Promise<ValidationResult> {
    try {
      let payloadClass: any;

      switch (eventType) {
        // Feedback events
        case 'feedback.FeedbackCreatedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'feedback.FeedbackSubmittedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'feedback.StatusChangedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'feedback.FeedbackAssignedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'feedback.AssignmentCreatedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'feedback.CommentAddedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'feedback.SLABreachedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'feedback.SLAWarningEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'feedback.FeedbackResolvedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'feedback.FeedbackClosedEvent':
          payloadClass = null; // Skip validation for now
          break;

        // Auth events
        case 'auth.UserRoleChangedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'auth.UserUpdatedEvent':
          payloadClass = null; // Skip validation for now
          break;
        case 'auth.UserCreatedEvent':
          payloadClass = null; // Skip validation for now
          break;

        default:
          this.logger.warn(`Unknown event type: ${eventType}`);
          return {
            isValid: true, // Allow unknown event types to pass through
          };
      }

      if (payloadClass) {
        const payloadInstance = plainToClass(payloadClass, payload);
        const errors = await validate(payloadInstance);

        if (errors.length > 0) {
          const errorMessages = errors.flatMap((error) => Object.values(error.constraints || {}));
          return {
            isValid: false,
            errors: errorMessages,
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      this.logger.error('Payload validation error:', error);
      return {
        isValid: false,
        errors: ['Invalid payload format'],
      };
    }
  }

  generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
