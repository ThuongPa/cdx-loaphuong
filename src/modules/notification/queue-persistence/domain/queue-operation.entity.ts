export interface QueueOperationProps {
  id?: string;
  operationId: string;
  operationType:
    | 'enqueue'
    | 'dequeue'
    | 'peek'
    | 'clear'
    | 'pause'
    | 'resume'
    | 'prioritize'
    | 'bulk_operation'
    | 'migrate'
    | 'backup'
    | 'restore';
  queueName: string;
  payload: {
    data: any;
    metadata?: Record<string, any>;
    priority?: number;
    delay?: number;
    ttl?: number;
    retryCount?: number;
    maxRetries?: number;
  };
  status: 'active' | 'paused' | 'draining' | 'maintenance' | 'error';
  result?: {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
    timestamp: Date;
  };
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  metadata?: Record<string, any>;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class QueueOperation {
  private constructor(private props: QueueOperationProps) {}

  static create(
    props: Omit<QueueOperationProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): QueueOperation {
    const now = new Date();
    return new QueueOperation({
      ...props,
      id: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): QueueOperation {
    return new QueueOperation({
      id: data._id?.toString(),
      operationId: data.operationId,
      operationType: data.operationType,
      queueName: data.queueName,
      payload: data.payload,
      status: data.status,
      result: data.result,
      errorMessage: data.errorMessage,
      retryCount: data.retryCount,
      maxRetries: data.maxRetries,
      nextRetryAt: data.nextRetryAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      cancelledAt: data.cancelledAt,
      metadata: data.metadata,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get operationId(): string {
    return this.props.operationId;
  }

  get operationType(): string {
    return this.props.operationType;
  }

  get queueName(): string {
    return this.props.queueName;
  }

  get payload(): any {
    return this.props.payload;
  }

  get status(): string {
    return this.props.status;
  }

  get result(): any {
    return this.props.result;
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

  get nextRetryAt(): Date | undefined {
    return this.props.nextRetryAt;
  }

  get startedAt(): Date | undefined {
    return this.props.startedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
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

  updateStatus(status: string): void {
    this.props.status = status as any;
    this.props.updatedAt = new Date();
  }

  updateResult(result: any): void {
    this.props.result = result;
    this.props.updatedAt = new Date();
  }

  updateErrorMessage(errorMessage: string): void {
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  incrementRetryCount(): void {
    this.props.retryCount += 1;
    this.props.updatedAt = new Date();
  }

  updateNextRetryAt(nextRetryAt: Date): void {
    this.props.nextRetryAt = nextRetryAt;
    this.props.updatedAt = new Date();
  }

  updateStartedAt(startedAt: Date): void {
    this.props.startedAt = startedAt;
    this.props.updatedAt = new Date();
  }

  updateCompletedAt(completedAt: Date): void {
    this.props.completedAt = completedAt;
    this.props.updatedAt = new Date();
  }

  updateCancelledAt(cancelledAt: Date): void {
    this.props.cancelledAt = cancelledAt;
    this.props.updatedAt = new Date();
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.props.metadata = metadata;
    this.props.updatedAt = new Date();
  }

  canRetry(): boolean {
    return this.props.retryCount < this.props.maxRetries;
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }

  isCompleted(): boolean {
    return this.props.status === 'active' && this.props.completedAt !== undefined;
  }

  isFailed(): boolean {
    return this.props.status === 'error';
  }

  toPersistence(): any {
    return {
      _id: this.props.id,
      operationId: this.props.operationId,
      operationType: this.props.operationType,
      queueName: this.props.queueName,
      payload: this.props.payload,
      status: this.props.status,
      result: this.props.result,
      errorMessage: this.props.errorMessage,
      retryCount: this.props.retryCount,
      maxRetries: this.props.maxRetries,
      nextRetryAt: this.props.nextRetryAt,
      startedAt: this.props.startedAt,
      completedAt: this.props.completedAt,
      cancelledAt: this.props.cancelledAt,
      metadata: this.props.metadata,
      createdBy: this.props.createdBy,
      updatedBy: this.props.updatedBy,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
