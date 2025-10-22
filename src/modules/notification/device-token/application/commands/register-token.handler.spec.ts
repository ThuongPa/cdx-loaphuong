import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, Delete, Res } from '@nestjs/common';
import { RegisterTokenHandler } from './register-token.handler';
import { RegisterTokenCommand } from './register-token.command';
import { DeviceTokenRepository } from '../../domain/device-token.repository';
import { NovuSubscriberSyncService } from '../services/novu-subscriber-sync.service';
import { DeviceToken } from '../../domain/device-token.entity';

describe('RegisterTokenHandler', () => {
  let handler: RegisterTokenHandler;
  let deviceTokenRepository: jest.Mocked<DeviceTokenRepository>;
  let novuSyncService: jest.Mocked<NovuSubscriberSyncService>;

  beforeEach(async () => {
    const mockDeviceTokenRepository = {
      findByUserAndDevice: jest.fn(),
      findByToken: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      existsByUserPlatformDevice: jest.fn(),
      softDelete: jest.fn(),
      delete: jest.fn(),
      findExpiredTokens: jest.fn(),
      updateLastUsed: jest.fn(),
      countActiveTokensByUser: jest.fn(),
    };

    const mockNovuSyncService = {
      syncSubscriberOnTokenRegistration: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterTokenHandler,
        {
          provide: 'DeviceTokenRepository',
          useValue: mockDeviceTokenRepository,
        },
        {
          provide: NovuSubscriberSyncService,
          useValue: mockNovuSyncService,
        },
      ],
    }).compile();

    handler = module.get<RegisterTokenHandler>(RegisterTokenHandler);
    deviceTokenRepository = module.get('DeviceTokenRepository');
    novuSyncService = module.get(NovuSubscriberSyncService);
  });

  describe('execute', () => {
    const command = new RegisterTokenCommand(
      'user-123',
      'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      'android',
      'expo',
      'device-123',
    );

    it('should register device token successfully', async () => {
      // Arrange
      deviceTokenRepository.findByUserAndDevice.mockResolvedValue(null);
      deviceTokenRepository.findByToken.mockResolvedValue(null);

      const mockDeviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      deviceTokenRepository.save.mockResolvedValue(mockDeviceToken);
      novuSyncService.syncSubscriberOnTokenRegistration.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(deviceTokenRepository.findByUserAndDevice).toHaveBeenCalledWith(
        'user-123',
        'device-123',
      );
      expect(deviceTokenRepository.findByToken).toHaveBeenCalledWith(
        'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      );
      expect(deviceTokenRepository.save).toHaveBeenCalled();
      expect(novuSyncService.syncSubscriberOnTokenRegistration).toHaveBeenCalledWith(
        mockDeviceToken,
      );
      expect(result).toBe(mockDeviceToken);
    });

    it('should throw ConflictException when token already exists for user and device', async () => {
      // Arrange
      const existingToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[existing-token-format]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      deviceTokenRepository.findByUserAndDevice.mockResolvedValue(existingToken);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(deviceTokenRepository.findByUserAndDevice).toHaveBeenCalledWith(
        'user-123',
        'device-123',
      );
      expect(deviceTokenRepository.findByToken).not.toHaveBeenCalled();
      expect(deviceTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when token is already in use by another user', async () => {
      // Arrange
      deviceTokenRepository.findByUserAndDevice.mockResolvedValue(null);

      const tokenInUse = DeviceToken.createFromRaw({
        userId: 'user-456', // Different user
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-456',
        channel: 'push',
      });

      deviceTokenRepository.findByToken.mockResolvedValue(tokenInUse);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(deviceTokenRepository.findByUserAndDevice).toHaveBeenCalledWith(
        'user-123',
        'device-123',
      );
      expect(deviceTokenRepository.findByToken).toHaveBeenCalledWith(
        'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      );
      expect(deviceTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should not throw when token is in use by same user', async () => {
      // Arrange
      deviceTokenRepository.findByUserAndDevice.mockResolvedValue(null);

      const tokenInUse = DeviceToken.createFromRaw({
        userId: 'user-123', // Same user
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-456',
        channel: 'push',
      });

      deviceTokenRepository.findByToken.mockResolvedValue(tokenInUse);

      const mockDeviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      deviceTokenRepository.save.mockResolvedValue(mockDeviceToken);
      novuSyncService.syncSubscriberOnTokenRegistration.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBe(mockDeviceToken);
      expect(deviceTokenRepository.save).toHaveBeenCalled();
    });

    it('should handle Novu sync failure gracefully', async () => {
      // Arrange
      deviceTokenRepository.findByUserAndDevice.mockResolvedValue(null);
      deviceTokenRepository.findByToken.mockResolvedValue(null);

      const mockDeviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      deviceTokenRepository.save.mockResolvedValue(mockDeviceToken);
      novuSyncService.syncSubscriberOnTokenRegistration.mockRejectedValue(
        new Error('Novu sync failed'),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBe(mockDeviceToken);
      expect(deviceTokenRepository.save).toHaveBeenCalled();
      expect(novuSyncService.syncSubscriberOnTokenRegistration).toHaveBeenCalledWith(
        mockDeviceToken,
      );
    });

    it('should throw error for invalid token format', async () => {
      // Arrange
      const invalidCommand = new RegisterTokenCommand(
        'user-123',
        'invalid-token-format',
        'android',
        'expo',
        'device-123',
      );

      deviceTokenRepository.findByUserAndDevice.mockResolvedValue(null);
      deviceTokenRepository.findByToken.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(invalidCommand)).rejects.toThrow();
      expect(deviceTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for incompatible provider-platform combination', async () => {
      // Arrange
      const invalidCommand = new RegisterTokenCommand(
        'user-123',
        'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        'ios',
        'fcm', // FCM is not compatible with iOS
        'device-123',
      );

      deviceTokenRepository.findByUserAndDevice.mockResolvedValue(null);
      deviceTokenRepository.findByToken.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(invalidCommand)).rejects.toThrow();
      expect(deviceTokenRepository.save).not.toHaveBeenCalled();
    });
  });
});
