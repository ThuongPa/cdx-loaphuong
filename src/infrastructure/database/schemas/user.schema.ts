import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../../common/enums/user-role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  _id: string; // CUID

  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: false })
  firstName?: string;

  @Prop({ required: false })
  lastName?: string;

  @Prop({ type: [String], enum: Object.values(UserRole), default: [UserRole.RESIDENT] })
  roles: UserRole[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastSyncedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ roles: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ lastSyncedAt: 1 });
