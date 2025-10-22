export interface MultiProviderProps {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'discord' | 'teams' | 'custom';
  config: Record<string, any>;
  isActive: boolean;
  priority: number;
  fallbackProviders?: string[];
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
  retryConfig?: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    baseDelay: number; // in milliseconds
  };
  healthCheck?: {
    enabled: boolean;
    interval: number; // in seconds
    timeout: number; // in milliseconds
    endpoint?: string;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class MultiProvider {
  private constructor(private props: MultiProviderProps) {}

  static create(props: Omit<MultiProviderProps, 'id' | 'createdAt' | 'updatedAt'>): MultiProvider {
    const now = new Date();
    return new MultiProvider({
      ...props,
      id: `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: MultiProviderProps): MultiProvider {
    return new MultiProvider(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): string {
    return this.props.type;
  }

  get config(): Record<string, any> {
    return this.props.config;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get priority(): number {
    return this.props.priority;
  }

  get fallbackProviders(): string[] {
    return this.props.fallbackProviders || [];
  }

  get rateLimit(): { requests: number; window: number } | undefined {
    return this.props.rateLimit;
  }

  get retryConfig():
    | { maxRetries: number; backoffStrategy: string; baseDelay: number }
    | undefined {
    return this.props.retryConfig;
  }

  get healthCheck():
    | { enabled: boolean; interval: number; timeout: number; endpoint?: string }
    | undefined {
    return this.props.healthCheck;
  }

  get metadata(): Record<string, any> {
    return this.props.metadata || {};
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateConfig(config: Record<string, any>): void {
    this.props.config = { ...this.props.config, ...config };
    this.props.updatedAt = new Date();
  }

  updatePriority(priority: number): void {
    this.props.priority = priority;
    this.props.updatedAt = new Date();
  }

  updateFallbackProviders(providers: string[]): void {
    this.props.fallbackProviders = providers;
    this.props.updatedAt = new Date();
  }

  updateRateLimit(rateLimit: { requests: number; window: number }): void {
    this.props.rateLimit = rateLimit;
    this.props.updatedAt = new Date();
  }

  updateRetryConfig(retryConfig: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    baseDelay: number;
  }): void {
    this.props.retryConfig = retryConfig;
    this.props.updatedAt = new Date();
  }

  updateHealthCheck(healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoint?: string;
  }): void {
    this.props.healthCheck = healthCheck;
    this.props.updatedAt = new Date();
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata };
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

  toPersistence(): MultiProviderProps {
    return { ...this.props };
  }
}
