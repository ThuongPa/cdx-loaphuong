import { Injectable, Inject } from '@nestjs/common';
import { DeviceToken } from '../../domain/device-token.entity';
import { DeviceTokenRepository } from '../../domain/device-token.repository';

@Injectable()
export class DeviceTokenService {
  constructor(
    @Inject('DeviceTokenRepository')
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  async createDeviceToken(
    userId: string,
    token: string,
    platform: string,
    provider: string,
    deviceId?: string,
    deviceName?: string,
    osVersion?: string,
    appVersion?: string,
  ): Promise<DeviceToken> {
    const deviceToken = DeviceToken.createFromRaw({
      userId,
      token,
      platform,
      provider,
      deviceId: deviceId || '',
      channel: 'push',
      deviceName,
      osVersion,
      appVersion,
      isActive: true,
    });

    return this.deviceTokenRepository.save(deviceToken);
  }

  async updateDeviceToken(
    id: string,
    userId: string,
    token?: string,
    isActive?: boolean,
  ): Promise<DeviceToken> {
    const deviceToken = await this.deviceTokenRepository.findById(id);
    if (!deviceToken) {
      throw new Error('Device token not found');
    }

    // Create new instance with updated values
    const updatedDeviceToken = DeviceToken.createFromRaw({
      userId: deviceToken.userId,
      token: token || deviceToken.token,
      platform: deviceToken.platform.value,
      provider: deviceToken.provider.value,
      deviceId: deviceToken.deviceId,
      channel: deviceToken.channel,
      deviceName: deviceToken.deviceName,
      osVersion: deviceToken.osVersion,
      appVersion: deviceToken.appVersion,
      isActive: isActive !== undefined ? isActive : deviceToken.isActive,
    });

    return this.deviceTokenRepository.save(updatedDeviceToken);
  }

  async deleteDeviceToken(id: string, userId: string): Promise<void> {
    return this.deviceTokenRepository.delete(id);
  }

  async getUserTokens(userId: string): Promise<DeviceToken[]> {
    return this.deviceTokenRepository.findByUserId(userId);
  }

  async getDeviceTokenById(id: string): Promise<DeviceToken | null> {
    return this.deviceTokenRepository.findById(id);
  }
}
