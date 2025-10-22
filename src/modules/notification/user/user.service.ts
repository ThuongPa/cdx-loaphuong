import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../infrastructure/database/schemas/user.schema';
import { UserRole } from '../../../common/enums/user-role.enum';

export interface CreateUserFromAuthEventDto {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  apartment?: string;
  building?: string;
  isActive: boolean;
}

export interface UpdateUserFromAuthEventDto {
  email?: string;
  name?: string;
  phone?: string;
  role?: string;
  apartment?: string;
  building?: string;
  isActive?: boolean;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  /**
   * Create user from Auth Service event
   * This is called by UserCreatedEventHandler when receiving UserCreatedEvent
   */
  async createFromAuthEvent(userData: CreateUserFromAuthEventDto): Promise<User> {
    this.logger.log(`Creating user from auth event: ${userData.email}`);

    try {
      // Map role string to UserRole enum
      const userRole = this.mapRoleToEnum(userData.role);

      const user = new this.userModel({
        _id: userData.userId,
        email: userData.email,
        phone: userData.phone,
        firstName: userData.name.split(' ')[0] || 'User',
        lastName: userData.name.split(' ').slice(1).join(' ') || '',
        roles: [userRole],
        isActive: userData.isActive,
        lastSyncedAt: new Date(),
        // Add metadata for tracking
        metadata: {
          syncSource: 'rabbitmq-event',
          lastSyncedAt: new Date(),
          apartment: userData.apartment,
          building: userData.building,
        },
      });

      const savedUser = await user.save();
      this.logger.log(`✅ User created successfully: ${savedUser.email}`);

      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to create user ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Find user by userId
   */
  async findByUserId(userId: string): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ _id: userId }).exec();
      return user;
    } catch (error) {
      this.logger.error(`Failed to find user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user from Auth Service event
   */
  async updateFromAuthEvent(userId: string, updates: UpdateUserFromAuthEventDto): Promise<User> {
    this.logger.log(`Updating user from auth event: ${userId}`);

    try {
      const updateData: any = {
        lastSyncedAt: new Date(),
        'metadata.lastSyncedAt': new Date(),
      };

      if (updates.email) updateData.email = updates.email;
      if (updates.name) {
        updateData.firstName = updates.name.split(' ')[0] || 'User';
        updateData.lastName = updates.name.split(' ').slice(1).join(' ') || '';
      }
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.role) updateData.roles = [this.mapRoleToEnum(updates.role)];
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      if (updates.apartment) updateData['metadata.apartment'] = updates.apartment;
      if (updates.building) updateData['metadata.building'] = updates.building;

      const updatedUser = await this.userModel
        .findByIdAndUpdate(userId, updateData, { new: true })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      this.logger.log(`✅ User updated successfully: ${updatedUser.email}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Soft delete user from Auth Service event
   */
  async softDeleteFromAuthEvent(userId: string): Promise<User> {
    this.logger.log(`Soft deleting user from auth event: ${userId}`);

    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            isActive: false,
            lastSyncedAt: new Date(),
            'metadata.lastSyncedAt': new Date(),
            'metadata.deletedAt': new Date(),
          },
          { new: true },
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      this.logger.log(`✅ User soft deleted successfully: ${updatedUser.email}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to soft delete user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update subscriber ID for Novu integration
   */
  async updateSubscriberId(userId: string, subscriberId: string): Promise<User> {
    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            subscriberId,
            'metadata.subscriberId': subscriberId,
            'metadata.novuSyncedAt': new Date(),
          },
          { new: true },
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      this.logger.log(`✅ User subscriber ID updated: ${userId} -> ${subscriberId}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update subscriber ID for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Map role string to UserRole enum
   */
  private mapRoleToEnum(role: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      ROLE_RESIDENT: UserRole.RESIDENT,
      ROLE_ADMIN: UserRole.ADMIN,
      ROLE_MANAGER: UserRole.MANAGER,
      ROLE_STAFF: UserRole.MANAGER, // Map STAFF to MANAGER
      resident: UserRole.RESIDENT,
      admin: UserRole.ADMIN,
      manager: UserRole.MANAGER,
      staff: UserRole.MANAGER, // Map staff to MANAGER
    };

    return roleMap[role] || UserRole.RESIDENT;
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const users = await this.userModel.find({ roles: role, isActive: true }).exec();

      return users;
    } catch (error) {
      this.logger.error(`Failed to get users by role ${role}:`, error);
      throw error;
    }
  }

  /**
   * Get all active users
   */
  async getAllActiveUsers(): Promise<User[]> {
    try {
      const users = await this.userModel.find({ isActive: true }).exec();

      return users;
    } catch (error) {
      this.logger.error('Failed to get all active users:', error);
      throw error;
    }
  }
}
