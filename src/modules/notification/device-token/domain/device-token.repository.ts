import { DeviceToken } from './device-token.entity';
import { Delete } from '@nestjs/common';

export interface DeviceTokenRepository {
  save(deviceToken: DeviceToken): Promise<DeviceToken>;
  findById(id: string): Promise<DeviceToken | null>;
  findByUserAndDevice(userId: string, deviceId: string): Promise<DeviceToken | null>;
  findByUserId(userId: string): Promise<DeviceToken[]>;
  findByUserIdAndActive(userId: string, isActive: boolean): Promise<DeviceToken[]>;
  findByToken(token: string): Promise<DeviceToken | null>;
  existsByUserPlatformDevice(userId: string, platform: string, deviceId: string): Promise<boolean>;
  softDelete(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  findExpiredTokens(): Promise<DeviceToken[]>;
  updateLastUsed(id: string): Promise<void>;
  countActiveTokensByUser(userId: string): Promise<number>;
}
