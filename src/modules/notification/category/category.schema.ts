import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  color?: string;

  @Prop()
  icon?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  parentId?: string;

  @Prop({ type: [String], default: [] })
  children: string[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true })
  createdBy: string;

  // Additional properties for targeting
  @Prop({ type: [Object], default: [] })
  members: Array<{ userId: string; joinedAt: Date; isActive: boolean }>;

  @Prop({ default: 0 })
  memberCount: number;

  @Prop({ default: 0 })
  engagementScore: number;

  @Prop({ default: 0 })
  notificationCount: number;

  @Prop()
  lastActivityAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
