import { Injectable, Delete } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { DeviceToken, DeviceTokenProps } from '../domain/device-token.entity';
import { DeviceTokenRepository } from '../domain/device-token.repository';
import { DevicePlatformVO } from '../domain/value-objects/device-platform.vo';
import { PushProviderVO } from '../domain/value-objects/push-provider.vo';
import { Type } from 'class-transformer';
import {
  DeviceToken as DeviceTokenSchemaClass,
  DeviceTokenSchema,
  DeviceTokenDocument,
} from '../../../../infrastructure/database/schemas/device-token.schema';

@Injectable()
export class DeviceTokenRepositoryImpl implements DeviceTokenRepository {
  constructor(
    @InjectModel('DeviceToken')
    private deviceTokenModel: Model<DeviceTokenDocument>,
  ) {}

  async save(deviceToken: DeviceToken): Promise<DeviceToken> {
    const props = deviceToken.toPersistence();
    const doc = new this.deviceTokenModel({
      _id: props.id,
      userId: props.userId,
      token: props.token,
      channel: props.channel,
      platform: props.platform.value,
      provider: props.provider.value,
      deviceId: props.deviceId,
      deviceName: props.deviceName,
      osVersion: props.osVersion,
      appVersion: props.appVersion,
      isActive: props.isActive,
      lastUsedAt: props.lastUsedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });

    await doc.save();
    return this.toDomain(doc);
  }

  async findById(id: string): Promise<DeviceToken | null> {
    const doc = await this.deviceTokenModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByUserAndDevice(userId: string, deviceId: string): Promise<DeviceToken | null> {
    const doc = await this.deviceTokenModel.findOne({ userId, deviceId, isActive: true }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByUserId(userId: string): Promise<DeviceToken[]> {
    const docs = await this.deviceTokenModel
      .find({ userId, isActive: true })
      .sort({ updatedAt: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByToken(token: string): Promise<DeviceToken | null> {
    const doc = await this.deviceTokenModel.findOne({ token, isActive: true }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async existsByUserPlatformDevice(
    userId: string,
    platform: string,
    deviceId: string,
  ): Promise<boolean> {
    const count = await this.deviceTokenModel
      .countDocuments({ userId, platform, deviceId, isActive: true })
      .exec();
    return count > 0;
  }

  async softDelete(id: string): Promise<void> {
    await this.deviceTokenModel
      .findByIdAndUpdate(id, { isActive: false, updatedAt: new Date() })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.deviceTokenModel.findByIdAndDelete(id).exec();
  }

  async findExpiredTokens(): Promise<DeviceToken[]> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const docs = await this.deviceTokenModel
      .find({
        isActive: false,
        lastUsedAt: { $lt: ninetyDaysAgo },
      })
      .exec();

    return docs.map((doc) => this.toDomain(doc));
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.deviceTokenModel
      .findByIdAndUpdate(id, {
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .exec();
  }

  async countActiveTokensByUser(userId: string): Promise<number> {
    return this.deviceTokenModel.countDocuments({ userId, isActive: true }).exec();
  }

  private toDomain(doc: DeviceTokenDocument): DeviceToken {
    const props: DeviceTokenProps = {
      id: doc._id,
      userId: doc.userId,
      token: doc.token,
      platform: DevicePlatformVO.create(doc.platform || 'unknown'),
      provider: PushProviderVO.create(doc.provider || 'fcm'),
      deviceId: doc.deviceId,
      channel: doc.channel,
      deviceName: (doc as any).deviceName,
      osVersion: (doc as any).osVersion,
      appVersion: (doc as any).appVersion,
      isActive: doc.isActive,
      lastUsedAt: doc.lastUsedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return DeviceToken.fromPersistence(props);
  }
}
