export enum AnalyticsMetricType {
  DELIVERY = 'delivery',
  OPEN = 'open',
  CLICK = 'click',
  CONVERSION = 'conversion',
  BOUNCE = 'bounce',
  UNSUBSCRIBE = 'unsubscribe',
  CUSTOM = 'custom',
}

export enum AnalyticsPeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export interface AnalyticsMetricProps {
  id: string;
  name: string;
  type: AnalyticsMetricType;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsData {
  metricId: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AnalyticsReportProps {
  id: string;
  name: string;
  description?: string;
  metrics: string[];
  filters: {
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
    channels?: string[];
    userSegments?: string[];
    categories?: string[];
    templates?: string[];
  };
  period: AnalyticsPeriod;
  isScheduled: boolean;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
  };
  recipients: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsDashboardProps {
  id: string;
  name: string;
  description?: string;
  widgets: Array<{
    id: string;
    type: 'chart' | 'table' | 'metric' | 'kpi';
    title: string;
    config: Record<string, any>;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AnalyticsMetric {
  private constructor(private props: AnalyticsMetricProps) {}

  static create(
    props: Omit<AnalyticsMetricProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): AnalyticsMetric {
    const now = new Date();
    return new AnalyticsMetric({
      ...props,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): AnalyticsMetric {
    return new AnalyticsMetric({
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

  get type(): AnalyticsMetricType {
    return this.props.type;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateContent(updates: Partial<AnalyticsMetricProps>): void {
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

  toPersistence(): any {
    return {
      ...this.props,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

export class AnalyticsReport {
  private constructor(private props: AnalyticsReportProps) {}

  static create(
    props: Omit<AnalyticsReportProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): AnalyticsReport {
    const now = new Date();
    return new AnalyticsReport({
      ...props,
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): AnalyticsReport {
    return new AnalyticsReport({
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

  get metrics(): string[] {
    return this.props.metrics;
  }

  get filters() {
    return this.props.filters;
  }

  get period(): AnalyticsPeriod {
    return this.props.period;
  }

  get isScheduled(): boolean {
    return this.props.isScheduled;
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

  updateContent(updates: Partial<AnalyticsReportProps>): void {
    this.props = { ...this.props, ...updates, updatedAt: new Date() };
  }

  schedule(schedule: AnalyticsReportProps['schedule']): void {
    this.props.isScheduled = true;
    this.props.schedule = schedule;
    this.props.updatedAt = new Date();
  }

  unschedule(): void {
    this.props.isScheduled = false;
    this.props.schedule = undefined;
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

export class AnalyticsDashboard {
  private constructor(private props: AnalyticsDashboardProps) {}

  static create(
    props: Omit<AnalyticsDashboardProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): AnalyticsDashboard {
    const now = new Date();
    return new AnalyticsDashboard({
      ...props,
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): AnalyticsDashboard {
    return new AnalyticsDashboard({
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

  get widgets() {
    return this.props.widgets;
  }

  get isPublic(): boolean {
    return this.props.isPublic;
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

  updateContent(updates: Partial<AnalyticsDashboardProps>): void {
    this.props = { ...this.props, ...updates, updatedAt: new Date() };
  }

  addWidget(widget: AnalyticsDashboardProps['widgets'][0]): void {
    this.props.widgets.push(widget);
    this.props.updatedAt = new Date();
  }

  removeWidget(widgetId: string): void {
    this.props.widgets = this.props.widgets.filter((w) => w.id !== widgetId);
    this.props.updatedAt = new Date();
  }

  updateWidget(widgetId: string, updates: Partial<AnalyticsDashboardProps['widgets'][0]>): void {
    const widgetIndex = this.props.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIndex !== -1) {
      this.props.widgets[widgetIndex] = { ...this.props.widgets[widgetIndex], ...updates };
      this.props.updatedAt = new Date();
    }
  }

  toPersistence(): any {
    return {
      ...this.props,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
