import { Test, TestingModule } from '@nestjs/testing';
import { NovuSubscriberSyncService } from '../../../src/modules/notification/device-token/application/services/novu-subscriber-sync.service';
import { NovuClient } from '../../../src/infrastructure/external/novu/novu.client';
import { DeviceToken } from '../../../src/modules/notification/device-token/domain/device-token.entity';

describe('NovuSubscriberSyncService Integration Tests', () => {
  let service: NovuSubscriberSyncService;
  let novuClient: jest.Mocked<NovuClient>;

  beforeEach(async () => {
    const mockNovuClient = {
      getSubscriber: jest.fn(),
      createSubscriber: jest.fn(),
      updateSubscriber: jest.fn(),
      deleteSubscriber: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NovuSubscriberSyncService,
        {
          provide: NovuClient,
          useValue: mockNovuClient,
        },
      ],
    }).compile();

    service = module.get<NovuSubscriberSyncService>(NovuSubscriberSyncService);
    novuClient = module.get(NovuClient);
  });

  describe('syncSubscriberOnTokenRegistration', () => {
    it('should create new subscriber when subscriber does not exist', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      // Mock subscriber not found
      novuClient.getSubscriber.mockRejectedValue(new Error('Subscriber not found'));
      novuClient.createSubscriber.mockResolvedValue();

      // Act
      await service.syncSubscriberOnTokenRegistration(deviceToken);

      // Assert
      expect(novuClient.getSubscriber).toHaveBeenCalledWith('user-123');
      expect(novuClient.createSubscriber).toHaveBeenCalledWith({
        subscriberId: 'user-123',
        data: {
          deviceTokens: [
            {
              id: deviceToken.id,
              token: deviceToken.token,
              platform: deviceToken.platform.value,
              provider: deviceToken.provider.value,
              deviceId: deviceToken.deviceId,
              isActive: deviceToken.isActive,
              lastUsedAt: deviceToken.lastUsedAt,
            },
          ],
          lastTokenUpdate: expect.any(String),
        },
      });
      expect(novuClient.updateSubscriber).not.toHaveBeenCalled();
    });

    it('should update existing subscriber when subscriber exists', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      const existingSubscriber = {
        subscriberId: 'user-123',
        data: {
          deviceTokens: [
            {
              id: 'existing-token-id',
              token: 'existing-token',
              platform: 'ios',
              provider: 'apns',
              deviceId: 'existing-device',
              isActive: true,
            },
          ],
        },
      };

      novuClient.getSubscriber.mockResolvedValue(existingSubscriber);
      novuClient.updateSubscriber.mockResolvedValue();

      // Act
      await service.syncSubscriberOnTokenRegistration(deviceToken);

      // Assert
      expect(novuClient.getSubscriber).toHaveBeenCalledWith('user-123');
      expect(novuClient.updateSubscriber).toHaveBeenCalledWith('user-123', {
        data: {
          ...existingSubscriber.data,
          deviceTokens: [
            existingSubscriber.data.deviceTokens[0],
            {
              id: deviceToken.id,
              token: deviceToken.token,
              platform: deviceToken.platform.value,
              provider: deviceToken.provider.value,
              deviceId: deviceToken.deviceId,
              isActive: deviceToken.isActive,
              lastUsedAt: deviceToken.lastUsedAt,
            },
          ],
          lastTokenUpdate: expect.any(String),
        },
      });
      expect(novuClient.createSubscriber).not.toHaveBeenCalled();
    });

    it('should handle Novu service errors gracefully', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      // Mock Novu service error
      novuClient.getSubscriber.mockRejectedValue(new Error('Novu service unavailable'));

      // Act & Assert - Should not throw
      await expect(service.syncSubscriberOnTokenRegistration(deviceToken)).resolves.not.toThrow();
    });
  });

  describe('syncSubscriberOnTokenUpdate', () => {
    it('should update subscriber when token is active', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        isActive: true,
        channel: 'push',
      });

      const existingSubscriber = {
        subscriberId: 'user-123',
        data: {
          deviceTokens: [
            {
              id: deviceToken.id,
              token: 'old-token',
              platform: 'android',
              provider: 'expo',
              deviceId: 'device-123',
              isActive: false,
            },
          ],
        },
      };

      novuClient.getSubscriber.mockResolvedValue(existingSubscriber);
      novuClient.updateSubscriber.mockResolvedValue();

      // Act
      await service.syncSubscriberOnTokenUpdate(deviceToken);

      // Assert
      expect(novuClient.updateSubscriber).toHaveBeenCalledWith('user-123', {
        data: {
          ...existingSubscriber.data,
          deviceTokens: [
            {
              id: deviceToken.id,
              token: deviceToken.token,
              platform: deviceToken.platform.value,
              provider: deviceToken.provider.value,
              deviceId: deviceToken.deviceId,
              isActive: deviceToken.isActive,
              lastUsedAt: deviceToken.lastUsedAt,
            },
          ],
          lastTokenUpdate: expect.any(String),
        },
      });
    });

    it('should remove device token from subscriber when token is inactive', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        isActive: false,
        channel: 'push',
      });

      const existingSubscriber = {
        subscriberId: 'user-123',
        data: {
          deviceTokens: [
            {
              id: deviceToken.id,
              token: deviceToken.token,
              platform: deviceToken.platform.value,
              provider: deviceToken.provider.value,
              deviceId: deviceToken.deviceId,
              isActive: true,
            },
            {
              id: 'other-token-id',
              token: 'other-token',
              platform: 'ios',
              provider: 'apns',
              deviceId: 'other-device',
              isActive: true,
            },
          ],
        },
      };

      novuClient.getSubscriber.mockResolvedValue(existingSubscriber);
      novuClient.updateSubscriber.mockResolvedValue();

      // Act
      await service.syncSubscriberOnTokenUpdate(deviceToken);

      // Assert
      expect(novuClient.updateSubscriber).toHaveBeenCalledWith('user-123', {
        data: {
          ...existingSubscriber.data,
          deviceTokens: [
            {
              id: 'other-token-id',
              token: 'other-token',
              platform: 'ios',
              provider: 'apns',
              deviceId: 'other-device',
              isActive: true,
            },
          ],
          lastTokenUpdate: expect.any(String),
        },
      });
    });
  });

  describe('syncSubscriberOnTokenDeletion', () => {
    it('should remove device token from subscriber', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      const existingSubscriber = {
        subscriberId: 'user-123',
        data: {
          deviceTokens: [
            {
              id: deviceToken.id,
              token: deviceToken.token,
              platform: deviceToken.platform.value,
              provider: deviceToken.provider.value,
              deviceId: deviceToken.deviceId,
              isActive: true,
            },
            {
              id: 'other-token-id',
              token: 'other-token',
              platform: 'ios',
              provider: 'apns',
              deviceId: 'other-device',
              isActive: true,
            },
          ],
        },
      };

      novuClient.getSubscriber.mockResolvedValue(existingSubscriber);
      novuClient.updateSubscriber.mockResolvedValue();

      // Act
      await service.syncSubscriberOnTokenDeletion(deviceToken);

      // Assert
      expect(novuClient.updateSubscriber).toHaveBeenCalledWith('user-123', {
        data: {
          ...existingSubscriber.data,
          deviceTokens: [
            {
              id: 'other-token-id',
              token: 'other-token',
              platform: 'ios',
              provider: 'apns',
              deviceId: 'other-device',
              isActive: true,
            },
          ],
          lastTokenUpdate: expect.any(String),
        },
      });
    });

    it('should handle case when subscriber does not exist', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      novuClient.getSubscriber.mockRejectedValue(new Error('Subscriber not found'));

      // Act & Assert - Should not throw
      await expect(service.syncSubscriberOnTokenDeletion(deviceToken)).resolves.not.toThrow();
      expect(novuClient.updateSubscriber).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      // Mock network timeout
      novuClient.getSubscriber.mockRejectedValue(new Error('Network timeout'));

      // Act & Assert - Should not throw
      await expect(service.syncSubscriberOnTokenRegistration(deviceToken)).resolves.not.toThrow();
    });

    it('should handle Novu API rate limiting gracefully', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      // Mock rate limit error
      novuClient.getSubscriber.mockRejectedValue(new Error('Rate limit exceeded'));

      // Act & Assert - Should not throw
      await expect(service.syncSubscriberOnTokenRegistration(deviceToken)).resolves.not.toThrow();
    });

    it('should handle invalid subscriber data gracefully', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      // Mock invalid subscriber data
      const invalidSubscriber = {
        subscriberId: 'user-123',
        data: null, // Invalid data
      };

      novuClient.getSubscriber.mockResolvedValue(invalidSubscriber);
      novuClient.updateSubscriber.mockResolvedValue();

      // Act & Assert - Should not throw
      await expect(service.syncSubscriberOnTokenRegistration(deviceToken)).resolves.not.toThrow();
    });
  });
});
