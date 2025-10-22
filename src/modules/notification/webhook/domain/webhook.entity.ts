export interface WebhookProps {
  id?: string;
  name: string;
  url: string;
  events: string[];
  headers?: Record<string, string>;
  secret?: string;
  isActive: boolean;
  timeout: number;
  retryCount: number;
  retryDelay: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Webhook {
  private constructor(private props: WebhookProps) {}

  static create(props: Omit<WebhookProps, 'id' | 'createdAt' | 'updatedAt'>): Webhook {
    const now = new Date();
    return new Webhook({
      ...props,
      id: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): Webhook {
    return new Webhook({
      id: data._id?.toString(),
      name: data.name,
      url: data.url,
      events: data.events,
      headers: data.headers,
      secret: data.secret,
      isActive: data.isActive,
      timeout: data.timeout,
      retryCount: data.retryCount,
      retryDelay: data.retryDelay,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get url(): string {
    return this.props.url;
  }

  get events(): string[] {
    return this.props.events;
  }

  get headers(): Record<string, string> | undefined {
    return this.props.headers;
  }

  get secret(): string | undefined {
    return this.props.secret;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get timeout(): number {
    return this.props.timeout;
  }

  get retryCount(): number {
    return this.props.retryCount;
  }

  get retryDelay(): number {
    return this.props.retryDelay;
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

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  updateUrl(url: string): void {
    this.props.url = url;
    this.props.updatedAt = new Date();
  }

  updateEvents(events: string[]): void {
    this.props.events = events;
    this.props.updatedAt = new Date();
  }

  updateHeaders(headers: Record<string, string>): void {
    this.props.headers = headers;
    this.props.updatedAt = new Date();
  }

  updateSecret(secret: string): void {
    this.props.secret = secret;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  updateTimeout(timeout: number): void {
    this.props.timeout = timeout;
    this.props.updatedAt = new Date();
  }

  updateRetrySettings(retryCount: number, retryDelay: number): void {
    this.props.retryCount = retryCount;
    this.props.retryDelay = retryDelay;
    this.props.updatedAt = new Date();
  }

  supportsEvent(eventType: string): boolean {
    return this.props.events.includes(eventType);
  }

  toPersistence(): any {
    return {
      _id: this.props.id,
      name: this.props.name,
      url: this.props.url,
      events: this.props.events,
      headers: this.props.headers,
      secret: this.props.secret,
      isActive: this.props.isActive,
      timeout: this.props.timeout,
      retryCount: this.props.retryCount,
      retryDelay: this.props.retryDelay,
      createdBy: this.props.createdBy,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
