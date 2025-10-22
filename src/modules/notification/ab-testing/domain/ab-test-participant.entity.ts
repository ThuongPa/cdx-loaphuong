export enum ParticipantStatus {
  ENROLLED = 'enrolled',
  EXPOSED = 'exposed',
  CONVERTED = 'converted',
  DROPPED = 'dropped',
}

export interface AbTestParticipantProps {
  testId: string;
  userId: string;
  variationId: string;
  status: ParticipantStatus;
  assignment: {
    method: 'random' | 'weighted' | 'manual';
    timestamp: Date;
    assignedBy?: string;
    reason?: string;
  };
  exposure: {
    timestamp: Date;
    channel: string;
    notificationId?: string;
    templateId?: string;
    content: Record<string, any>;
  };
  interactions: Array<{
    type: 'delivered' | 'opened' | 'clicked' | 'converted' | 'dismissed' | 'bounced';
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  conversions: Array<{
    metricName: string;
    value: number;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  attributes: {
    userSegment?: string;
    category?: string;
    channel?: string;
    deviceType?: string;
    timezone?: string;
    [key: string]: any;
  };
  enrolledAt: Date;
  exposedAt?: Date;
  convertedAt?: Date;
  droppedAt?: Date;
  metadata: {
    source?: string;
    campaignId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class AbTestParticipant {
  private constructor(private props: AbTestParticipantProps) {}

  static create(props: Omit<AbTestParticipantProps, 'createdAt' | 'updatedAt'>): AbTestParticipant {
    const now = new Date();
    return new AbTestParticipant({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): AbTestParticipant {
    return new AbTestParticipant({
      ...data,
      enrolledAt: new Date(data.enrolledAt),
      exposedAt: data.exposedAt ? new Date(data.exposedAt) : undefined,
      convertedAt: data.convertedAt ? new Date(data.convertedAt) : undefined,
      droppedAt: data.droppedAt ? new Date(data.droppedAt) : undefined,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  get id(): string {
    return `${this.props.testId}_${this.props.userId}`;
  }

  get testId(): string {
    return this.props.testId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get variationId(): string {
    return this.props.variationId;
  }

  get status(): ParticipantStatus {
    return this.props.status;
  }

  get assignment() {
    return this.props.assignment;
  }

  get exposure() {
    return this.props.exposure;
  }

  get interactions() {
    return this.props.interactions;
  }

  get conversions() {
    return this.props.conversions;
  }

  get attributes() {
    return this.props.attributes;
  }

  get enrolledAt(): Date {
    return this.props.enrolledAt;
  }

  get exposedAt(): Date | undefined {
    return this.props.exposedAt;
  }

  get convertedAt(): Date | undefined {
    return this.props.convertedAt;
  }

  get droppedAt(): Date | undefined {
    return this.props.droppedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  expose(exposure: AbTestParticipantProps['exposure']): void {
    if (this.props.status !== ParticipantStatus.ENROLLED) {
      throw new Error('Only enrolled participants can be exposed');
    }
    this.props.status = ParticipantStatus.EXPOSED;
    this.props.exposure = exposure;
    this.props.exposedAt = new Date();
    this.props.updatedAt = new Date();
  }

  recordInteraction(interaction: AbTestParticipantProps['interactions'][0]): void {
    this.props.interactions.push(interaction);
    this.props.updatedAt = new Date();
  }

  recordConversion(conversion: AbTestParticipantProps['conversions'][0]): void {
    this.props.conversions.push(conversion);
    if (this.props.status === ParticipantStatus.EXPOSED) {
      this.props.status = ParticipantStatus.CONVERTED;
      this.props.convertedAt = new Date();
    }
    this.props.updatedAt = new Date();
  }

  drop(): void {
    this.props.status = ParticipantStatus.DROPPED;
    this.props.droppedAt = new Date();
    this.props.updatedAt = new Date();
  }

  updateAttributes(attributes: Partial<AbTestParticipantProps['attributes']>): void {
    this.props.attributes = { ...this.props.attributes, ...attributes };
    this.props.updatedAt = new Date();
  }

  toPersistence(): any {
    return {
      ...this.props,
      enrolledAt: this.props.enrolledAt,
      exposedAt: this.props.exposedAt,
      convertedAt: this.props.convertedAt,
      droppedAt: this.props.droppedAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
