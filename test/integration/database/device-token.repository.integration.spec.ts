import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';
import { DeviceTokenRepositoryImpl } from '../../../src/modules/notification/device-token/infrastructure/device-token.repository.impl';
import { DeviceTokenSchema } from '../../../src/infrastructure/database/schemas/device-token.schema';
import { DeviceToken } from '../../../src/modules/notification/device-token/domain/device-token.entity';

describe('DeviceTokenRepository Integration Tests', () => {
  let module: TestingModule;
  let repository: DeviceTokenRepositoryImpl;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: 'DeviceToken', schema: DeviceTokenSchema }]),
      ],
      providers: [DeviceTokenRepositoryImpl],
    }).compile();

    repository = module.get<DeviceTokenRepositoryImpl>(DeviceTokenRepositoryImpl);
  });

  afterAll(async () => {
    await module.close();
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    // Clean up all collections to prevent test data pollution
    await mongoConnection.db?.collection('device_tokens').deleteMany({});
    await mongoConnection.db?.collection('user_notifications').deleteMany({});
    await mongoConnection.db?.collection('notifications').deleteMany({});

    // Force cleanup of any remaining test data
    try {
      const collections = await mongoConnection.db?.listCollections().toArray();
      if (collections) {
        for (const collection of collections) {
          await mongoConnection.db?.collection(collection.name).deleteMany({});
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('save', () => {
    it('should save device token successfully', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      // Act
      const savedToken = await repository.save(deviceToken);

      // Assert
      expect(savedToken).toBeDefined();
      expect(savedToken.id).toBe(deviceToken.id);
      expect(savedToken.userId).toBe('user-123');
      expect(savedToken.token).toBe('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
      expect(savedToken.platform.value).toBe('android');
      expect(savedToken.provider.value).toBe('expo');
      expect(savedToken.deviceId).toBe('device-123');
      expect(savedToken.isActive).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find device token by ID', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      const savedToken = await repository.save(deviceToken);

      // Act
      const foundToken = await repository.findById(savedToken.id);

      // Assert
      expect(foundToken).toBeDefined();
      expect(foundToken!.id).toBe(savedToken.id);
      expect(foundToken!.userId).toBe('user-123');
    });

    it('should return null when token not found', async () => {
      // Act
      const foundToken = await repository.findById('non-existent-id');

      // Assert
      expect(foundToken).toBeNull();
    });
  });

  describe('findByUserAndDevice', () => {
    it('should find device token by user and device', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      await repository.save(deviceToken);

      // Act
      const foundToken = await repository.findByUserAndDevice('user-123', 'device-123');

      // Assert
      expect(foundToken).toBeDefined();
      expect(foundToken!.userId).toBe('user-123');
      expect(foundToken!.deviceId).toBe('device-123');
    });

    it('should return null when token not found', async () => {
      // Act
      const foundToken = await repository.findByUserAndDevice('user-123', 'non-existent-device');

      // Assert
      expect(foundToken).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all active tokens for user', async () => {
      // Arrange
      const token1 = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[token-1]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-1',
        channel: 'push',
      });

      const token2 = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        platform: 'ios',
        provider: 'apns',
        deviceId: 'device-2',
        channel: 'push',
      });

      const token3 = DeviceToken.createFromRaw({
        userId: 'user-456', // Different user
        token: 'ExponentPushToken[token-3]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-3',
        channel: 'push',
      });

      await repository.save(token1);
      await repository.save(token2);
      await repository.save(token3);

      // Act
      const userTokens = await repository.findByUserId('user-123');

      // Assert
      expect(userTokens).toHaveLength(2);
      expect(userTokens.every((token) => token.userId === 'user-123')).toBe(true);
      expect(userTokens.every((token) => token.isActive)).toBe(true);
    });

    it('should return empty array when user has no tokens', async () => {
      // Act
      const userTokens = await repository.findByUserId('user-with-no-tokens');

      // Assert
      expect(userTokens).toEqual([]);
    });
  });

  describe('findByToken', () => {
    it('should find device token by token string', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      await repository.save(deviceToken);

      // Act
      const foundToken = await repository.findByToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');

      // Assert
      expect(foundToken).toBeDefined();
      expect(foundToken!.token).toBe('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
    });

    it('should return null when token not found', async () => {
      // Act
      const foundToken = await repository.findByToken('non-existent-token');

      // Assert
      expect(foundToken).toBeNull();
    });
  });

  describe('existsByUserPlatformDevice', () => {
    it('should return true when token exists', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      await repository.save(deviceToken);

      // Act
      const exists = await repository.existsByUserPlatformDevice(
        'user-123',
        'android',
        'device-123',
      );

      // Assert
      expect(exists).toBe(true);
    });

    it('should return false when token does not exist', async () => {
      // Act
      const exists = await repository.existsByUserPlatformDevice(
        'user-123',
        'android',
        'non-existent-device',
      );

      // Assert
      expect(exists).toBe(false);
    });
  });

  describe('softDelete', () => {
    it('should soft delete device token', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      const savedToken = await repository.save(deviceToken);

      // Act
      await repository.softDelete(savedToken.id);

      // Assert
      const foundToken = await repository.findById(savedToken.id);
      expect(foundToken).toBeDefined();
      expect(foundToken!.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('should hard delete device token', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      const savedToken = await repository.save(deviceToken);

      // Act
      await repository.delete(savedToken.id);

      // Assert
      const foundToken = await repository.findById(savedToken.id);
      expect(foundToken).toBeNull();
    });
  });

  describe('updateLastUsed', () => {
    it('should update last used timestamp', async () => {
      // Arrange
      const deviceToken = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-123',
        channel: 'push',
      });

      const savedToken = await repository.save(deviceToken);

      // Act
      await repository.updateLastUsed(savedToken.id);

      // Assert
      const foundToken = await repository.findById(savedToken.id);
      expect(foundToken).toBeDefined();
      expect(foundToken!.lastUsedAt).toBeDefined();
      expect(foundToken!.lastUsedAt!.getTime()).toBeCloseTo(Date.now(), -2);
    });
  });

  describe('countActiveTokensByUser', () => {
    it('should count active tokens for user', async () => {
      // Arrange
      const token1 = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'ExponentPushToken[token-1]',
        platform: 'android',
        provider: 'expo',
        deviceId: 'device-1',
        channel: 'push',
      });

      const token2 = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678',
        platform: 'ios',
        provider: 'apns',
        deviceId: 'device-2',
        channel: 'push',
      });

      const token3 = DeviceToken.createFromRaw({
        userId: 'user-123',
        token: 'fcm-token:format',
        platform: 'web',
        provider: 'fcm',
        deviceId: 'device-3',
        isActive: false,
        channel: 'push',
      });

      await repository.save(token1);
      await repository.save(token2);
      await repository.save(token3);

      // Act
      const count = await repository.countActiveTokensByUser('user-123');

      // Assert
      expect(count).toBe(2);
    });

    it('should return 0 when user has no active tokens', async () => {
      // Act
      const count = await repository.countActiveTokensByUser('user-with-no-tokens');

      // Assert
      expect(count).toBe(0);
    });
  });
});
