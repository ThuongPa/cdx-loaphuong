import { IsString, IsOptional, IsObject, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Res } from '@nestjs/common';

export enum FeedbackStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class FeedbackCreatedEventPayload {
  @IsString()
  feedbackId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(FeedbackPriority)
  priority?: FeedbackPriority;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class FeedbackSubmittedEventPayload {
  @IsString()
  feedbackId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}

export class StatusChangedEventPayload {
  @IsString()
  feedbackId: string;

  @IsEnum(FeedbackStatus)
  previousStatus: FeedbackStatus;

  @IsEnum(FeedbackStatus)
  newStatus: FeedbackStatus;

  @IsString()
  changedBy: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class FeedbackAssignedEventPayload {
  @IsString()
  feedbackId: string;

  @IsString()
  assignedTo: string;

  @IsString()
  assignedBy: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignmentCreatedEventPayload {
  @IsString()
  assignmentId: string;

  @IsString()
  feedbackId: string;

  @IsString()
  assignedTo: string;

  @IsString()
  assignedBy: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class CommentAddedEventPayload {
  @IsString()
  commentId: string;

  @IsString()
  feedbackId: string;

  @IsString()
  userId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;
}

export class SLABreachedEventPayload {
  @IsString()
  feedbackId: string;

  @IsString()
  slaType: string;

  @IsString()
  breachedAt: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class SLAWarningEventPayload {
  @IsString()
  feedbackId: string;

  @IsString()
  slaType: string;

  @IsString()
  warningAt: string;

  @IsString()
  timeRemaining: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class FeedbackResolvedEventPayload {
  @IsString()
  feedbackId: string;

  @IsString()
  resolvedBy: string;

  @IsString()
  resolution: string;

  @IsOptional()
  @IsString()
  resolutionDate?: string;
}

export class FeedbackClosedEventPayload {
  @IsString()
  feedbackId: string;

  @IsString()
  closedBy: string;

  @IsOptional()
  @IsString()
  closureReason?: string;

  @IsOptional()
  @IsString()
  closureDate?: string;
}
