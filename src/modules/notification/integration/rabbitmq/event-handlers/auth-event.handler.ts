import { Injectable, Logger } from '@nestjs/common';
import { BaseEventHandler, BaseEventDto } from './base-event.handler';
import { UserService } from '../../../user/user.service';
import { NovuSubscriberQueueService } from '../../../../../infrastructure/external/novu/novu-subscriber-queue.service';

@Injectable()
export class UserRoleChangedEventHandler extends BaseEventHandler {
  protected readonly logger = new Logger(UserRoleChangedEventHandler.name);

  constructor(private readonly userService: UserService) {
    super();
  }

  getEventType(): string {
    return 'auth.UserRoleChangedEvent';
  }

  async handle(event: BaseEventDto): Promise<void> {
    this.logEventProcessing(event, 'user role changed');

    try {
      const { payload } = event;
      const userId = payload.aggregateId;

      this.logger.log(`📝 User role changed: ${userId}`);
      this.logger.debug(`New role: ${payload.role}`);

      // Update user role in local database
      await this.userService.updateFromAuthEvent(userId, {
        role: payload.role,
      });

      this.logger.log(`✅ User role updated successfully: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle user role changed event:`, error);
      throw error;
    }
  }
}

@Injectable()
export class UserUpdatedEventHandler extends BaseEventHandler {
  protected readonly logger = new Logger(UserUpdatedEventHandler.name);

  constructor(
    private readonly userService: UserService,
    private readonly novuSubscriberQueue: NovuSubscriberQueueService,
  ) {
    super();
  }

  getEventType(): string {
    return 'auth.UserUpdatedEvent';
  }

  async handle(event: BaseEventDto): Promise<void> {
    this.logEventProcessing(event, 'user updated');

    try {
      const { payload } = event;
      const userId = payload.aggregateId;

      this.logger.log(`📝 User updated: ${userId}`);
      this.logger.debug(`Changes: ${JSON.stringify(payload.changes, null, 2)}`);

      // Check if user exists in local database
      const existingUser = await this.userService.findByUserId(userId);
      if (!existingUser) {
        this.logger.warn(`User ${userId} not found in local database, cannot update`);
        return;
      }

      // Update user in local database
      await this.userService.updateFromAuthEvent(userId, payload.changes.after);

      // Check if any fields affecting Novu need to be updated
      const hasNovuChanges =
        payload.changes.after.email ||
        payload.changes.after.phone !== undefined ||
        payload.changes.after.name ||
        payload.changes.after.role ||
        payload.changes.after.apartment ||
        payload.changes.after.building;

      if (hasNovuChanges) {
        // Enqueue Novu subscriber update
        this.novuSubscriberQueue.enqueueUpdate({
          userId,
          email: payload.changes.after.email,
          phone: payload.changes.after.phone,
          name: payload.changes.after.name,
          role: payload.changes.after.role,
          apartment: payload.changes.after.apartment,
          building: payload.changes.after.building,
          changes: payload.changes.after,
        });

        this.logger.log(`✅ Novu subscriber update job queued: ${userId}`);
      }

      this.logger.log(`✅ User updated successfully: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle user updated event:`, error);
      throw error;
    }
  }
}

@Injectable()
export class UserCreatedEventHandler extends BaseEventHandler {
  protected readonly logger = new Logger(UserCreatedEventHandler.name);

  constructor(
    private readonly userService: UserService,
    private readonly novuSubscriberQueue: NovuSubscriberQueueService,
  ) {
    super();
  }

  getEventType(): string {
    return 'auth.UserCreatedEvent';
  }

  async handle(event: BaseEventDto): Promise<void> {
    this.logEventProcessing(event, 'user created');

    try {
      const { payload } = event;
      const { userData } = payload;

      this.logger.log(
        `📥 New user created: ${userData.email} (${userData.name}) - Role: ${userData.role}`,
      );

      // Check if user already exists (prevent duplicates)
      const existingUser = await this.userService.findByUserId(userData.userId);
      if (existingUser) {
        this.logger.warn(
          `⚠️ User ${userData.userId} already exists in local database, skipping creation`,
        );
        return;
      }

      // ========================================
      // STEP 1: Create user in local database (FAST ~100ms)
      // ========================================
      const createdUser = await this.userService.createFromAuthEvent({
        userId: userData.userId,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        apartment: userData.apartment,
        building: userData.building,
        isActive: userData.isActive,
      });

      this.logger.log(`✅ User synchronized to local DB: ${createdUser.email}`);

      // ========================================
      // STEP 2: Queue Novu subscriber creation (NON-BLOCKING ~10ms)
      // ========================================
      this.novuSubscriberQueue.enqueueCreate({
        userId: userData.userId,
        email: userData.email,
        phone: userData.phone,
        name: userData.name,
        role: userData.role,
        apartment: userData.apartment,
        building: userData.building,
        isActive: userData.isActive,
      });

      this.logger.log(`📋 Enqueued Novu subscriber task: ${userData.userId}`);
      this.logger.debug(`⚡ Total ACK time: ~110ms (MongoDB + enqueue)`);

      // ⚡ Method returns here → RabbitMQ ACK happens immediately
      // Novu subscriber creation happens in background queue
    } catch (error) {
      this.logger.error(`Failed to handle user created event:`, error);

      // Don't throw if it's a duplicate key error (race condition)
      if (error.code === 11000) {
        this.logger.warn(`⚠️ Duplicate user detected (race condition), treating as success`);
        return;
      }

      throw error; // Re-throw other errors for retry mechanism
    }
  }
}

@Injectable()
export class UserDeletedEventHandler extends BaseEventHandler {
  protected readonly logger = new Logger(UserDeletedEventHandler.name);

  constructor(private readonly userService: UserService) {
    super();
  }

  getEventType(): string {
    return 'auth.UserDeletedEvent';
  }

  async handle(event: BaseEventDto): Promise<void> {
    this.logEventProcessing(event, 'user deleted');

    try {
      const { payload } = event;
      const userId = payload.aggregateId;

      this.logger.log(`🗑️ User deleted: ${userId}`);

      // Soft delete user in local database
      await this.userService.softDeleteFromAuthEvent(userId);

      this.logger.log(`✅ User soft deleted successfully: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle user deleted event:`, error);
      throw error;
    }
  }
}
