export enum AbTestStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AbTestType {
  CONTENT = 'content',
  DELIVERY_TIME = 'delivery_time',
  CHANNEL = 'channel',
  TEMPLATE = 'template',
  SUBJECT_LINE = 'subject_line',
  CALL_TO_ACTION = 'call_to_action',
}

export enum VariationType {
  CONTROL = 'control',
  VARIANT = 'variant',
}

export interface AbTestProps {
  name: string;
  description?: string;
  testType: AbTestType;
  status: AbTestStatus;
  targetAudience: {
    userSegments?: string[];
    categories?: string[];
    channels?: string[];
    userAttributes?: Record<string, any>;
    exclusionCriteria?: Record<string, any>;
  };
  variations: Array<{
    id: string;
    name: string;
    type?: VariationType;
    content: {
      subject?: string;
      body?: string;
      templateId?: string;
      channel?: string;
      deliveryTime?: string;
      callToAction?: string;
      metadata?: Record<string, any>;
    };
    weight?: number;
    isControl: boolean;
  }>;
  trafficAllocation: {
    control: number;
    variants: Array<{
      variationId: string;
      percentage: number;
    }>;
  };
  successMetrics: Array<{
    name: string;
    type: 'conversion' | 'engagement' | 'delivery' | 'click' | 'custom';
    targetValue?: number;
    isPrimary: boolean;
  }>;
  duration: {
    startDate: Date;
    endDate: Date;
    minDuration?: number;
    maxDuration?: number;
  };
  statisticalSettings: {
    confidenceLevel: number;
    minimumSampleSize: number;
    significanceThreshold: number;
    maxParticipants?: number;
  };
  results: {
    totalParticipants: number;
    controlGroup: {
      participants: number;
      conversions: number;
      conversionRate: number;
      metrics: Record<string, number>;
    };
    variants: Array<{
      variationId: string;
      participants: number;
      conversions: number;
      conversionRate: number;
      metrics: Record<string, number>;
      significance: number;
      confidenceInterval: {
        lower: number;
        upper: number;
      };
      isWinner: boolean;
    }>;
    statisticalSignificance: boolean;
    winner?: string;
    confidenceLevel: number;
    pValue: number;
  };
  settings: {
    autoStopOnSignificance?: boolean;
    autoStopOnMaxDuration?: boolean;
    notifyOnCompletion?: boolean;
    notifyOnSignificance?: boolean;
    customRules?: Record<string, any>;
  };
  createdBy: string;
  updatedBy?: string;
  startedAt?: Date;
  startedBy?: string;
  completedAt?: Date;
  stoppedBy?: string;
  pausedAt?: Date;
  cancelledAt?: Date;
  metadata: {
    tags?: string[];
    priority?: number;
    category?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class AbTest {
  private constructor(private props: AbTestProps) {}

  static create(props: Omit<AbTestProps, 'createdAt' | 'updatedAt' | 'results'>): AbTest {
    const now = new Date();
    return new AbTest({
      ...props,
      results: {
        totalParticipants: 0,
        controlGroup: {
          participants: 0,
          conversions: 0,
          conversionRate: 0,
          metrics: {},
        },
        variants: [],
        statisticalSignificance: false,
        confidenceLevel: 0,
        pValue: 0,
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): AbTest {
    return new AbTest({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  get id(): string {
    return this.props.name; // Using name as ID for now
  }

  get name(): string {
    return this.props.name;
  }

  get status(): AbTestStatus {
    return this.props.status;
  }

  get testType(): AbTestType {
    return this.props.testType;
  }

  get targetAudience() {
    return this.props.targetAudience;
  }

  get variations() {
    return this.props.variations;
  }

  get results() {
    return this.props.results;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateContent(updates: Partial<AbTestProps>): void {
    this.props = { ...this.props, ...updates, updatedAt: new Date() };
  }

  start(startedBy: string): void {
    if (this.props.status !== AbTestStatus.DRAFT) {
      throw new Error('Only draft tests can be started');
    }
    this.props.status = AbTestStatus.ACTIVE;
    this.props.startedAt = new Date();
    this.props.startedBy = startedBy;
    this.props.updatedAt = new Date();
  }

  stop(stoppedBy: string): void {
    if (this.props.status !== AbTestStatus.ACTIVE) {
      throw new Error('Only active tests can be stopped');
    }
    this.props.status = AbTestStatus.COMPLETED;
    this.props.completedAt = new Date();
    this.props.stoppedBy = stoppedBy;
    this.props.updatedAt = new Date();
  }

  pause(): void {
    if (this.props.status !== AbTestStatus.ACTIVE) {
      throw new Error('Only active tests can be paused');
    }
    this.props.status = AbTestStatus.PAUSED;
    this.props.pausedAt = new Date();
    this.props.updatedAt = new Date();
  }

  resume(): void {
    if (this.props.status !== AbTestStatus.PAUSED) {
      throw new Error('Only paused tests can be resumed');
    }
    this.props.status = AbTestStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  cancel(cancelledBy: string): void {
    this.props.status = AbTestStatus.CANCELLED;
    this.props.cancelledAt = new Date();
    this.props.updatedAt = new Date();
  }

  updateResults(results: Partial<AbTestProps['results']>): void {
    this.props.results = { ...this.props.results, ...results };
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
