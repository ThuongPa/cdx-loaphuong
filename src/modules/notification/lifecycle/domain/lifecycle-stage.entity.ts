export interface LifecycleStageProps {
  id: string;
  name: string;
  description?: string;
  type: 'onboarding' | 'engagement' | 'retention' | 'reactivation' | 'churn_prevention' | 'custom';
  isActive: boolean;
  order: number;
  triggers: LifecycleTrigger[];
  actions: LifecycleAction[];
  conditions: LifecycleCondition[];
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecycleTrigger {
  type: 'user_signup' | 'user_login' | 'user_inactive' | 'user_activity' | 'time_based' | 'custom';
  config: Record<string, any>;
  delay?: number;
  repeatable?: boolean;
}

export interface LifecycleAction {
  type: 'send_notification' | 'update_user' | 'send_email' | 'create_task' | 'custom';
  config: Record<string, any>;
  delay?: number;
  priority?: number;
}

export interface LifecycleCondition {
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

export class LifecycleStage {
  private constructor(private props: LifecycleStageProps) {}

  static create(
    props: Omit<LifecycleStageProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): LifecycleStage {
    const now = new Date();
    return new LifecycleStage({
      ...props,
      id: `lifecycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): LifecycleStage {
    return new LifecycleStage({
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

  get type(): string {
    return this.props.type;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get order(): number {
    return this.props.order;
  }

  get triggers(): LifecycleTrigger[] {
    return this.props.triggers;
  }

  get actions(): LifecycleAction[] {
    return this.props.actions;
  }

  get conditions(): LifecycleCondition[] {
    return this.props.conditions;
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

  updateContent(updates: Partial<LifecycleStageProps>): void {
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

  addTrigger(trigger: LifecycleTrigger): void {
    this.props.triggers.push(trigger);
    this.props.updatedAt = new Date();
  }

  removeTrigger(index: number): void {
    if (index >= 0 && index < this.props.triggers.length) {
      this.props.triggers.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  addAction(action: LifecycleAction): void {
    this.props.actions.push(action);
    this.props.updatedAt = new Date();
  }

  removeAction(index: number): void {
    if (index >= 0 && index < this.props.actions.length) {
      this.props.actions.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  addCondition(condition: LifecycleCondition): void {
    this.props.conditions.push(condition);
    this.props.updatedAt = new Date();
  }

  removeCondition(index: number): void {
    if (index >= 0 && index < this.props.conditions.length) {
      this.props.conditions.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  updateOrder(order: number): void {
    this.props.order = order;
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
