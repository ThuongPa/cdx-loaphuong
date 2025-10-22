export interface BulkOperationProps {
  id?: string;
  operationId: string;
  operationType:
    | 'bulk_send'
    | 'bulk_update'
    | 'bulk_delete'
    | 'bulk_export'
    | 'bulk_import'
    | 'bulk_sync'
    | 'bulk_retry'
    | 'bulk_cancel';
  name: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    processed: number;
    failed: number;
    skipped: number;
    percentage: number;
  };
  filters: Record<string, any>;
  options: {
    batchSize?: number;
    concurrency?: number;
    retryAttempts?: number;
    timeout?: number;
    dryRun?: boolean;
  };
  result?: {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
    timestamp: Date;
  };
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  metadata?: Record<string, any>;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BulkOperation {
  private constructor(private props: BulkOperationProps) {}

  static create(props: Omit<BulkOperationProps, 'id' | 'createdAt' | 'updatedAt'>): BulkOperation {
    const now = new Date();
    return new BulkOperation({
      ...props,
      id: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): BulkOperation {
    return new BulkOperation({
      id: data._id?.toString(),
      operationId: data.operationId,
      operationType: data.operationType,
      name: data.name,
      description: data.description,
      status: data.status,
      progress: data.progress,
      filters: data.filters,
      options: data.options,
      result: data.result,
      errorMessage: data.errorMessage,
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

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get status(): string {
    return this.props.status;
  }

  get progress(): any {
    return this.props.progress;
  }

  get filters(): Record<string, any> {
    return this.props.filters;
  }

  get options(): any {
    return this.props.options;
  }

  get result(): any {
    return this.props.result;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
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

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  updateDescription(description: string): void {
    this.props.description = description;
    this.props.updatedAt = new Date();
  }

  updateStatus(status: string): void {
    this.props.status = status as any;
    this.props.updatedAt = new Date();
  }

  updateProgress(progress: any): void {
    this.props.progress = progress;
    this.props.updatedAt = new Date();
  }

  updateFilters(filters: Record<string, any>): void {
    this.props.filters = filters;
    this.props.updatedAt = new Date();
  }

  updateOptions(options: any): void {
    this.props.options = options;
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

  isPending(): boolean {
    return this.props.status === 'pending';
  }

  isProcessing(): boolean {
    return this.props.status === 'processing';
  }

  isCompleted(): boolean {
    return this.props.status === 'completed';
  }

  isFailed(): boolean {
    return this.props.status === 'failed';
  }

  isCancelled(): boolean {
    return this.props.status === 'cancelled';
  }

  canStart(): boolean {
    return this.props.status === 'pending';
  }

  canCancel(): boolean {
    return this.props.status === 'pending' || this.props.status === 'processing';
  }

  toPersistence(): any {
    return {
      _id: this.props.id,
      operationId: this.props.operationId,
      operationType: this.props.operationType,
      name: this.props.name,
      description: this.props.description,
      status: this.props.status,
      progress: this.props.progress,
      filters: this.props.filters,
      options: this.props.options,
      result: this.props.result,
      errorMessage: this.props.errorMessage,
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
