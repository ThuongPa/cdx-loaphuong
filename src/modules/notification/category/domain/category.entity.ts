export interface CategoryProps {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  parentId?: string;
  children?: string[];
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Additional properties for targeting
  members?: Array<{ userId: string; joinedAt: Date; isActive: boolean }>;
  memberCount?: number;
  engagementScore?: number;
  notificationCount?: number;
  lastActivityAt?: Date;
}

export class Category {
  private constructor(private props: CategoryProps) {}

  static create(props: Omit<CategoryProps, 'id' | 'createdAt' | 'updatedAt'>): Category {
    const now = new Date();
    return new Category({
      ...props,
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: any): Category {
    return new Category({
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

  get color(): string | undefined {
    return this.props.color;
  }

  get icon(): string | undefined {
    return this.props.icon;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get parentId(): string | undefined {
    return this.props.parentId;
  }

  get children(): string[] {
    return this.props.children || [];
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

  get members(): Array<{ userId: string; joinedAt: Date; isActive: boolean }> {
    return this.props.members || [];
  }

  get memberCount(): number {
    return this.props.memberCount || 0;
  }

  get engagementScore(): number {
    return this.props.engagementScore || 0;
  }

  get notificationCount(): number {
    return this.props.notificationCount || 0;
  }

  get lastActivityAt(): Date | undefined {
    return this.props.lastActivityAt;
  }

  updateContent(updates: Partial<CategoryProps>): void {
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

  addChild(childId: string): void {
    if (!this.props.children) {
      this.props.children = [];
    }
    if (!this.props.children.includes(childId)) {
      this.props.children.push(childId);
      this.props.updatedAt = new Date();
    }
  }

  removeChild(childId: string): void {
    if (this.props.children) {
      this.props.children = this.props.children.filter((id) => id !== childId);
      this.props.updatedAt = new Date();
    }
  }

  setParent(parentId: string): void {
    this.props.parentId = parentId;
    this.props.updatedAt = new Date();
  }

  removeParent(): void {
    this.props.parentId = undefined;
    this.props.updatedAt = new Date();
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata };
    this.props.updatedAt = new Date();
  }

  addMember(userId: string): void {
    if (!this.props.members) {
      this.props.members = [];
    }
    const existingMember = this.props.members.find((m) => m.userId === userId);
    if (!existingMember) {
      this.props.members.push({
        userId,
        joinedAt: new Date(),
        isActive: true,
      });
      this.props.memberCount = this.props.members.length;
      this.props.updatedAt = new Date();
    }
  }

  removeMember(userId: string): void {
    if (this.props.members) {
      this.props.members = this.props.members.filter((m) => m.userId !== userId);
      this.props.memberCount = this.props.members.length;
      this.props.updatedAt = new Date();
    }
  }

  updateEngagementScore(score: number): void {
    this.props.engagementScore = score;
    this.props.updatedAt = new Date();
  }

  incrementNotificationCount(): void {
    this.props.notificationCount = (this.props.notificationCount || 0) + 1;
    this.props.lastActivityAt = new Date();
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
