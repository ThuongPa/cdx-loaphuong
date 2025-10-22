export interface FallbackStrategyProps {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  conditions: FallbackCondition[];
  actions: FallbackAction[];
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FallbackCondition {
  type: 'channel_failure' | 'provider_failure' | 'rate_limit' | 'timeout' | 'custom';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: any;
  field?: string;
}

export interface FallbackAction {
  type: 'retry' | 'alternative_channel' | 'alternative_provider' | 'escalate' | 'custom';
  config: Record<string, any>;
  delay?: number;
  maxAttempts?: number;
}

export class FallbackStrategy {
  private constructor(private props: FallbackStrategyProps) {}

  static create(
    props: Omit<FallbackStrategyProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): FallbackStrategy {
    const now = new Date();
    return new FallbackStrategy({
      ...props,
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): FallbackStrategy {
    return new FallbackStrategy({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get priority(): number {
    return this.props.priority;
  }

  get conditions(): FallbackCondition[] {
    return this.props.conditions;
  }

  get actions(): FallbackAction[] {
    return this.props.actions;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
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

  updateContent(updates: Partial<FallbackStrategyProps>): void {
    this.props = { ...this.props, ...updates, updatedAt: new Date() };
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  addCondition(condition: FallbackCondition): void {
    this.props.conditions.push(condition);
    this.props.updatedAt = new Date();
  }

  removeCondition(index: number): void {
    if (index >= 0 && index < this.props.conditions.length) {
      this.props.conditions.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  addAction(action: FallbackAction): void {
    this.props.actions.push(action);
    this.props.updatedAt = new Date();
  }

  removeAction(index: number): void {
    if (index >= 0 && index < this.props.actions.length) {
      this.props.actions.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  updatePriority(priority: number): void {
    this.props.priority = priority;
    this.props.updatedAt = new Date();
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata };
    this.props.updatedAt = new Date();
  }

  toPersistence(): any {
    return {
      ...this.props,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
