export interface UserSyncProps {
  id?: string;
  userId: string;
  type:
    | 'user_update'
    | 'preferences_update'
    | 'device_update'
    | 'user_delete'
    | 'full_sync'
    | 'incremental_sync'
    | 'realtime_sync';
  source: 'api' | 'webhook' | 'manual' | 'auth_service' | 'novu' | 'external_api';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  data?: Record<string, any>;
  reason?: string;
  priority: number;
  isScheduled: boolean;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserSync {
  private constructor(private props: UserSyncProps) {}

  static create(props: Omit<UserSyncProps, 'id' | 'createdAt' | 'updatedAt'>): UserSync {
    const now = new Date();
    return new UserSync({
      ...props,
      id: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): UserSync {
    return new UserSync({
      id: data._id?.toString(),
      userId: data.userId,
      type: data.type,
      source: data.source,
      status: data.status,
      data: data.data,
      reason: data.reason,
      priority: data.priority,
      isScheduled: data.isScheduled,
      scheduledAt: data.scheduledAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      errorMessage: data.errorMessage,
      retryCount: data.retryCount,
      maxRetries: data.maxRetries,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): string {
    return this.props.type;
  }

  get source(): string {
    return this.props.source;
  }

  get status(): string {
    return this.props.status;
  }

  get data(): Record<string, any> | undefined {
    return this.props.data;
  }

  get reason(): string | undefined {
    return this.props.reason;
  }

  get priority(): number {
    return this.props.priority;
  }

  get isScheduled(): boolean {
    return this.props.isScheduled;
  }

  get scheduledAt(): Date | undefined {
    return this.props.scheduledAt;
  }

  get startedAt(): Date | undefined {
    return this.props.startedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get retryCount(): number {
    return this.props.retryCount;
  }

  get maxRetries(): number {
    return this.props.maxRetries;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateStatus(status: string, errorMessage?: string): void {
    this.props.status = status as any;
    this.props.updatedAt = new Date();

    if (errorMessage) {
      this.props.errorMessage = errorMessage;
    }

    if (status === 'in_progress') {
      this.props.startedAt = new Date();
    } else if (status === 'completed') {
      this.props.completedAt = new Date();
    }
  }

  incrementRetryCount(): void {
    this.props.retryCount += 1;
    this.props.updatedAt = new Date();
  }

  canRetry(): boolean {
    return this.props.retryCount < this.props.maxRetries;
  }

  toPersistence(): any {
    return {
      _id: this.props.id,
      userId: this.props.userId,
      type: this.props.type,
      source: this.props.source,
      status: this.props.status,
      data: this.props.data,
      reason: this.props.reason,
      priority: this.props.priority,
      isScheduled: this.props.isScheduled,
      scheduledAt: this.props.scheduledAt,
      startedAt: this.props.startedAt,
      completedAt: this.props.completedAt,
      errorMessage: this.props.errorMessage,
      retryCount: this.props.retryCount,
      maxRetries: this.props.maxRetries,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
