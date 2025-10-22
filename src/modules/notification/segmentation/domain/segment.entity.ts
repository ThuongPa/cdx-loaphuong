export interface SegmentProps {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  criteria: SegmentCriteria[];
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCriteria {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'regex'
    | 'in'
    | 'not_in'
    | 'exists'
    | 'not_exists';
  value: any;
  logic?: 'and' | 'or';
}

export class Segment {
  private constructor(private props: SegmentProps) {}

  static create(props: Omit<SegmentProps, 'id' | 'createdAt' | 'updatedAt'>): Segment {
    const now = new Date();
    return new Segment({
      ...props,
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): Segment {
    return new Segment({
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

  get criteria(): SegmentCriteria[] {
    return this.props.criteria;
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

  updateContent(updates: Partial<SegmentProps>): void {
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

  addCriteria(criteria: SegmentCriteria): void {
    this.props.criteria.push(criteria);
    this.props.updatedAt = new Date();
  }

  removeCriteria(index: number): void {
    if (index >= 0 && index < this.props.criteria.length) {
      this.props.criteria.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  updateCriteria(index: number, criteria: SegmentCriteria): void {
    if (index >= 0 && index < this.props.criteria.length) {
      this.props.criteria[index] = criteria;
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
