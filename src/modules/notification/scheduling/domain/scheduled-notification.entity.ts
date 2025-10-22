export interface SchedulePattern {
  type: 'once' | 'recurring' | 'cron';
  cronExpression?: string;
  recurringType?: 'daily' | 'weekly' | 'monthly';
  recurringDays?: number[];
  recurringDayOfMonth?: number;
  timezone: string;
  scheduledAt?: Date;
}

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  categoryId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channels?: string[];
}

export interface TargetAudience {
  userIds?: string[];
  categoryIds?: string[];
  userSegments?: string[];
  excludeUserIds?: string[];
}

export interface ScheduledNotificationProps {
  id?: string;
  name: string;
  description?: string;
  schedulePattern: SchedulePattern;
  notificationContent: NotificationContent;
  targetAudience: TargetAudience;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduledAt: Date;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
  expiresAt?: Date;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class ScheduledNotification {
  private constructor(private props: ScheduledNotificationProps) {}

  static create(
    props: Omit<ScheduledNotificationProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): ScheduledNotification {
    const now = new Date();
    return new ScheduledNotification({
      ...props,
      id: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): ScheduledNotification {
    return new ScheduledNotification({
      id: data._id?.toString(),
      name: data.name,
      description: data.description,
      schedulePattern: data.schedulePattern,
      notificationContent: data.notificationContent,
      targetAudience: data.targetAudience,
      status: data.status,
      scheduledAt: data.scheduledAt,
      lastExecutedAt: data.lastExecutedAt,
      nextExecutionAt: data.nextExecutionAt,
      executionCount: data.executionCount,
      successCount: data.successCount,
      failureCount: data.failureCount,
      expiresAt: data.expiresAt,
      isActive: data.isActive,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      metadata: data.metadata,
    });
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get schedulePattern(): SchedulePattern {
    return this.props.schedulePattern;
  }

  get notificationContent(): NotificationContent {
    return this.props.notificationContent;
  }

  get targetAudience(): TargetAudience {
    return this.props.targetAudience;
  }

  get status(): string {
    return this.props.status;
  }

  get scheduledAt(): Date {
    return this.props.scheduledAt;
  }

  get lastExecutedAt(): Date | undefined {
    return this.props.lastExecutedAt;
  }

  get nextExecutionAt(): Date | undefined {
    return this.props.nextExecutionAt;
  }

  get executionCount(): number {
    return this.props.executionCount;
  }

  get successCount(): number {
    return this.props.successCount;
  }

  get failureCount(): number {
    return this.props.failureCount;
  }

  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get updatedBy(): string | undefined {
    return this.props.updatedBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  updateDescription(description: string): void {
    this.props.description = description;
    this.props.updatedAt = new Date();
  }

  updateSchedulePattern(schedulePattern: SchedulePattern): void {
    this.props.schedulePattern = schedulePattern;
    this.props.updatedAt = new Date();
  }

  updateNotificationContent(notificationContent: NotificationContent): void {
    this.props.notificationContent = notificationContent;
    this.props.updatedAt = new Date();
  }

  updateTargetAudience(targetAudience: TargetAudience): void {
    this.props.targetAudience = targetAudience;
    this.props.updatedAt = new Date();
  }

  updateStatus(status: string): void {
    this.props.status = status as any;
    this.props.updatedAt = new Date();
  }

  updateScheduledAt(scheduledAt: Date): void {
    this.props.scheduledAt = scheduledAt;
    this.props.updatedAt = new Date();
  }

  updateLastExecutedAt(lastExecutedAt: Date): void {
    this.props.lastExecutedAt = lastExecutedAt;
    this.props.updatedAt = new Date();
  }

  updateNextExecutionAt(nextExecutionAt: Date): void {
    this.props.nextExecutionAt = nextExecutionAt;
    this.props.updatedAt = new Date();
  }

  incrementExecutionCount(): void {
    this.props.executionCount += 1;
    this.props.updatedAt = new Date();
  }

  incrementSuccessCount(): void {
    this.props.successCount += 1;
    this.props.updatedAt = new Date();
  }

  incrementFailureCount(): void {
    this.props.failureCount += 1;
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

  updateExpiresAt(expiresAt: Date): void {
    this.props.expiresAt = expiresAt;
    this.props.updatedAt = new Date();
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.props.metadata = metadata;
    this.props.updatedAt = new Date();
  }

  isExpired(): boolean {
    return this.props.expiresAt ? new Date() > this.props.expiresAt : false;
  }

  isReadyForExecution(): boolean {
    return (
      this.props.isActive &&
      (this.props.status === 'pending' || this.props.status === 'scheduled') &&
      this.props.nextExecutionAt !== undefined &&
      new Date() >= this.props.nextExecutionAt
    );
  }

  toPersistence(): any {
    return {
      _id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      schedulePattern: this.props.schedulePattern,
      notificationContent: this.props.notificationContent,
      targetAudience: this.props.targetAudience,
      status: this.props.status,
      scheduledAt: this.props.scheduledAt,
      lastExecutedAt: this.props.lastExecutedAt,
      nextExecutionAt: this.props.nextExecutionAt,
      executionCount: this.props.executionCount,
      successCount: this.props.successCount,
      failureCount: this.props.failureCount,
      expiresAt: this.props.expiresAt,
      isActive: this.props.isActive,
      createdBy: this.props.createdBy,
      updatedBy: this.props.updatedBy,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      metadata: this.props.metadata,
    };
  }
}
