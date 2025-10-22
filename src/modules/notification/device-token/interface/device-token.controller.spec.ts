import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DeviceTokenController } from './device-token.controller';
import { RegisterTokenDto } from './dto/register-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';
import { DeviceToken, DevicePlatform, PushProvider } from '../domain/device-token.entity';
import { Controller, Query, Res } from '@nestjs/common';

describe('DeviceTokenController', () => {
  let controller: DeviceTokenController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const mockQueryBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceTokenController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    controller = module.get<DeviceTokenController>(DeviceTokenController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  describe('registerToken', () => {
    it('should register device token successfully and include metadata', async () => {
      // Arrange
      const registerTokenDto: RegisterTokenDto = {
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: DevicePlatform.ANDROID,
        provider: PushProvider.EXPO,
        deviceId: 'device-123',
        deviceName: 'Pixel 9',
        osVersion: 'Android 15',
        appVersion: '2.1.0',
      };

      const userId = 'user-123';

      const mockDeviceToken = DeviceToken.createFromRaw({
        userId,
        token: registerTokenDto.token,
        platform: registerTokenDto.platform,
        provider: registerTokenDto.provider,
        deviceId: registerTokenDto.deviceId,
        channel: 'push',
        deviceName: registerTokenDto.deviceName,
        osVersion: registerTokenDto.osVersion,
        appVersion: registerTokenDto.appVersion,
      });

      commandBus.execute.mockResolvedValue(mockDeviceToken);

      // Act
      const result = await controller.registerToken(registerTokenDto, userId);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          token: registerTokenDto.token,
          platform: registerTokenDto.platform,
          provider: registerTokenDto.provider,
          deviceId: registerTokenDto.deviceId,
          deviceName: registerTokenDto.deviceName,
          osVersion: registerTokenDto.osVersion,
          appVersion: registerTokenDto.appVersion,
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: mockDeviceToken.id,
          userId: mockDeviceToken.userId,
          token: mockDeviceToken.token,
          platform: mockDeviceToken.platform.value,
          provider: mockDeviceToken.provider.value,
          deviceId: mockDeviceToken.deviceId,
          isActive: mockDeviceToken.isActive,
          lastUsedAt: mockDeviceToken.lastUsedAt,
          deviceName: registerTokenDto.deviceName,
          osVersion: registerTokenDto.osVersion,
          appVersion: registerTokenDto.appVersion,
          createdAt: mockDeviceToken.createdAt,
          updatedAt: mockDeviceToken.updatedAt,
        }),
      );
    });

    it('should throw 400 when provider-platform is incompatible', async () => {
      const registerTokenDto: RegisterTokenDto = {
        token: 'some-fcm-token',
        platform: DevicePlatform.IOS,
        provider: PushProvider.FCM,
        deviceId: 'device-123',
      };

      const userId = 'user-123';

      await expect(controller.registerToken(registerTokenDto, userId)).rejects.toThrow(
        /không tương thích/i,
      );
    });
  });

  describe('updateToken', () => {
    it('should update device token successfully', async () => {
      // Arrange
      const tokenId = 'token-123';
      const updateTokenDto: UpdateTokenDto = {
        token: 'ExponentPushToken[new-token-123]',
        isActive: false,
      };

      const userId = 'user-123';

      const mockDeviceToken = DeviceToken.createFromRaw({
        userId,
        token: updateTokenDto.token!,
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        isActive: updateTokenDto.isActive!,
        channel: 'push',
      });

      commandBus.execute.mockResolvedValue(mockDeviceToken);

      // Act
      const result = await controller.updateToken(tokenId, updateTokenDto, userId);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tokenId,
          userId,
          token: updateTokenDto.token,
          isActive: updateTokenDto.isActive,
        }),
      );

      expect(result).toEqual({
        id: mockDeviceToken.id,
        userId: mockDeviceToken.userId,
        token: mockDeviceToken.token,
        platform: mockDeviceToken.platform.value,
        provider: mockDeviceToken.provider.value,
        deviceId: mockDeviceToken.deviceId,
        isActive: mockDeviceToken.isActive,
        lastUsedAt: mockDeviceToken.lastUsedAt,
        createdAt: mockDeviceToken.createdAt,
        updatedAt: mockDeviceToken.updatedAt,
      });
    });

    it('should update device token with partial data', async () => {
      // Arrange
      const tokenId = 'token-123';
      const updateTokenDto: UpdateTokenDto = {
        isActive: true,
      };

      const userId = 'user-123';

      const mockDeviceToken = DeviceToken.createFromRaw({
        userId,
        token: 'ExponentPushToken[existing-token]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        isActive: updateTokenDto.isActive!,
        channel: 'push',
      });

      commandBus.execute.mockResolvedValue(mockDeviceToken);

      // Act
      const result = await controller.updateToken(tokenId, updateTokenDto, userId);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tokenId,
          userId,
          token: undefined,
          isActive: updateTokenDto.isActive,
        }),
      );

      expect(result.isActive).toBe(true);
    });
  });

  describe('deleteToken', () => {
    it('should delete device token successfully', async () => {
      // Arrange
      const tokenId = 'token-123';
      const userId = 'user-123';

      commandBus.execute.mockResolvedValue(undefined);

      // Act
      await controller.deleteToken(tokenId, userId);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tokenId,
          userId,
        }),
      );
    });
  });

  describe('getUserTokens', () => {
    it('should get user tokens successfully', async () => {
      // Arrange
      const userId = 'user-123';

      const mockDeviceTokens = [
        DeviceToken.createFromRaw({
          userId,
          token: 'ExponentPushToken[token-1]',
          platform: 'android',
          provider: 'expo',
          deviceId: 'device-1',
          channel: 'push',
        }),
        DeviceToken.createFromRaw({
          userId,
          token: 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
          platform: 'ios',
          provider: 'apns',
          deviceId: 'device-2',
          channel: 'push',
        }),
      ];

      queryBus.execute.mockResolvedValue(mockDeviceTokens);

      // Act
      const result = await controller.getUserTokens(userId);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
        }),
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockDeviceTokens[0].id,
        userId: mockDeviceTokens[0].userId,
        token: mockDeviceTokens[0].token,
        platform: mockDeviceTokens[0].platform.value,
        provider: mockDeviceTokens[0].provider.value,
        deviceId: mockDeviceTokens[0].deviceId,
        isActive: mockDeviceTokens[0].isActive,
        lastUsedAt: mockDeviceTokens[0].lastUsedAt,
        createdAt: mockDeviceTokens[0].createdAt,
        updatedAt: mockDeviceTokens[0].updatedAt,
      });
    });

    it('should return empty array when user has no tokens', async () => {
      // Arrange
      const userId = 'user-123';

      queryBus.execute.mockResolvedValue([]);

      // Act
      const result = await controller.getUserTokens(userId);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
        }),
      );

      expect(result).toEqual([]);
    });
  });
});
