export interface ThrottleRuleProps {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  type: 'rate_limit' | 'burst_limit' | 'time_window' | 'user_based' | 'channel_based';
  conditions: ThrottleCondition[];
  limits: ThrottleLimit[];
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThrottleCondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'regex'
    | 'in'
    | 'not_in';
  value: any;
  logic?: 'and' | 'or';
}

export interface ThrottleLimit {
  window: number; // in seconds
  maxCount: number;
  scope: 'user' | 'global' | 'channel' | 'type';
  action: 'block' | 'delay' | 'queue' | 'skip';
}

export class ThrottleRule {
  private constructor(private props: ThrottleRuleProps) {}

  static create(props: Omit<ThrottleRuleProps, 'id' | 'createdAt' | 'updatedAt'>): ThrottleRule {
    const now = new Date();
    return new ThrottleRule({
      ...props,
      id: `throttle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): ThrottleRule {
    return new ThrottleRule({
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

  get type(): string {
    return this.props.type;
  }

  get conditions(): ThrottleCondition[] {
    return this.props.conditions;
  }

  get limits(): ThrottleLimit[] {
    return this.props.limits;
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

  updateContent(updates: Partial<ThrottleRuleProps>): void {
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

  addCondition(condition: ThrottleCondition): void {
    this.props.conditions.push(condition);
    this.props.updatedAt = new Date();
  }

  removeCondition(index: number): void {
    if (index >= 0 && index < this.props.conditions.length) {
      this.props.conditions.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  addLimit(limit: ThrottleLimit): void {
    this.props.limits.push(limit);
    this.props.updatedAt = new Date();
  }

  removeLimit(index: number): void {
    if (index >= 0 && index < this.props.limits.length) {
      this.props.limits.splice(index, 1);
      this.props.updatedAt = new Date();
    }
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
