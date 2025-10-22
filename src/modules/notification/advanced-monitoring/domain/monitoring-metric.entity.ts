export interface MonitoringMetricProps {
  id?: string;
  metricId: string;
  name: string;
  description?: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'custom';
  value: number;
  unit?: string;
  tags: Record<string, string>;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MonitoringMetric {
  private constructor(private props: MonitoringMetricProps) {}

  static create(
    props: Omit<MonitoringMetricProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): MonitoringMetric {
    const now = new Date();
    return new MonitoringMetric({
      ...props,
      id: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): MonitoringMetric {
    return new MonitoringMetric({
      id: data._id?.toString(),
      metricId: data.metricId,
      name: data.name,
      description: data.description,
      type: data.type,
      value: data.value,
      unit: data.unit,
      tags: data.tags,
      timestamp: data.timestamp,
      source: data.source,
      metadata: data.metadata,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get metricId(): string {
    return this.props.metricId;
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

  get value(): number {
    return this.props.value;
  }

  get unit(): string | undefined {
    return this.props.unit;
  }

  get tags(): Record<string, string> {
    return this.props.tags;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get source(): string {
    return this.props.source;
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

  updateValue(value: number): void {
    this.props.value = value;
    this.props.updatedAt = new Date();
  }

  updateTags(tags: Record<string, string>): void {
    this.props.tags = tags;
    this.props.updatedAt = new Date();
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.props.metadata = metadata;
    this.props.updatedAt = new Date();
  }

  isCounter(): boolean {
    return this.props.type === 'counter';
  }

  isGauge(): boolean {
    return this.props.type === 'gauge';
  }

  isHistogram(): boolean {
    return this.props.type === 'histogram';
  }

  isSummary(): boolean {
    return this.props.type === 'summary';
  }

  isCustom(): boolean {
    return this.props.type === 'custom';
  }

  toPersistence(): any {
    return {
      _id: this.props.id,
      metricId: this.props.metricId,
      name: this.props.name,
      description: this.props.description,
      type: this.props.type,
      value: this.props.value,
      unit: this.props.unit,
      tags: this.props.tags,
      timestamp: this.props.timestamp,
      source: this.props.source,
      metadata: this.props.metadata,
      createdBy: this.props.createdBy,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
