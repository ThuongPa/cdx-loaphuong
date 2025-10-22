import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import {
  DeviceTokenSchema,
  DeviceTokenSchemaFactory,
} from '../../../src/infrastructure/database/schemas/device-token.schema';
import {
  DevicePlatform,
  PushProvider,
} from '../../../src/modules/notification/device-token/domain/device-token.entity';

describe('Device Token API Integration Tests', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let authToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: DeviceTokenSchema.name, schema: DeviceTokenSchemaFactory },
        ]),
        // Import AppModule or create a minimal test module
        // For now, we'll create a minimal setup
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Mock auth token for testing
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await app.close();
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await mongoConnection.db?.collection('device_tokens').deleteMany({});
  });

  describe('POST /api/v1/device-tokens', () => {
    it('should register device token successfully and return metadata', async () => {
      const registerTokenDto = {
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: DevicePlatform.ANDROID,
        provider: PushProvider.EXPO,
        deviceId: 'device-123',
        deviceName: 'Pixel 9',
        osVersion: 'Android 15',
        appVersion: '2.1.0',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send(registerTokenDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        userId: expect.any(String),
        token: registerTokenDto.token,
        platform: registerTokenDto.platform,
        provider: registerTokenDto.provider,
        deviceId: registerTokenDto.deviceId,
        isActive: true,
        deviceName: registerTokenDto.deviceName,
        osVersion: registerTokenDto.osVersion,
        appVersion: registerTokenDto.appVersion,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });
    it('should return 400 when provider and platform are incompatible', async () => {
      const invalidCombo = {
        token: 'fcm-token',
        platform: DevicePlatform.IOS,
        provider: PushProvider.FCM,
        deviceId: 'device-999',
      };

      await request(app.getHttpServer())
        .post('/api/v1/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCombo)
        .expect(400);
    });

    it('should return 400 for invalid request data', async () => {
      const invalidDto = {
        token: '', // Invalid empty token
        platform: DevicePlatform.ANDROID,
        provider: PushProvider.EXPO,
        deviceId: 'device-123',
      };

      await request(app.getHttpServer())
        .post('/api/v1/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should return 401 for missing authorization', async () => {
      const registerTokenDto = {
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: DevicePlatform.ANDROID,
        provider: PushProvider.EXPO,
        deviceId: 'device-123',
      };

      await request(app.getHttpServer())
        .post('/api/v1/device-tokens')
        .send(registerTokenDto)
        .expect(401);
    });

    it('should return 409 for duplicate device token', async () => {
      const registerTokenDto = {
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: DevicePlatform.ANDROID,
        provider: PushProvider.EXPO,
        deviceId: 'device-123',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/api/v1/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send(registerTokenDto)
        .expect(201);

      // Second registration with same device should fail
      await request(app.getHttpServer())
        .post('/api/v1/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send(registerTokenDto)
        .expect(409);
    });
  });

  describe('PUT /api/v1/device-tokens/:id', () => {
    let deviceTokenId: string;

    beforeEach(async () => {
      // Create a device token for testing
      const registerTokenDto = {
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: DevicePlatform.ANDROID,
        provider: PushProvider.EXPO,
        deviceId: 'device-123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send(registerTokenDto)
        .expect(201);

      deviceTokenId = response.body.id;
    });

    it('should update device token successfully', async () => {
      const updateTokenDto = {
        token: 'ExponentPushToken[new-token-123]',
        isActive: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/device-tokens/${deviceTokenId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTokenDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: deviceTokenId,
        token: updateTokenDto.token,
        isActive: updateTokenDto.isActive,
        updatedAt: expect.any(String),
      });
    });

    it('should update device token with partial data', async () => {
      const updateTokenDto = {
        isActive: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/device-tokens/${deviceTokenId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTokenDto)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should return 404 for non-existent token', async () => {
      const updateTokenDto = {
        isActive: false,
      };

      await request(app.getHttpServer())
        .put('/api/v1/device-tokens/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTokenDto)
        .expect(404);
    });

    it('should return 401 for missing authorization', async () => {
      const updateTokenDto = {
        isActive: false,
      };

      await request(app.getHttpServer())
        .put(`/api/v1/device-tokens/${deviceTokenId}`)
        .send(updateTokenDto)
        .expect(401);
    });
  });

  describe('DELETE /api/v1/device-tokens/:id', () => {
    let deviceTokenId: string;

    beforeEach(async () => {
      // Create a device token for testing
      const registerTokenDto = {
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: DevicePlatform.ANDROID,
        provider: PushProvider.EXPO,
        deviceId: 'device-123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/device-tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .send(registerTokenDto)
        .expect(201);

      deviceTokenId = response.body.id;
    });

    it('should delete device token successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/device-tokens/${deviceTokenId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 for non-existent token', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/device-tokens/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 for missing authorization', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/device-tokens/${deviceTokenId}`)
        .expect(401);
    });
  });

  describe('GET /api/v1/device-tokens/me', () => {
    beforeEach(async () => {
      // Create multiple device tokens for testing
      const tokens = [
        {
          token: 'ExponentPushToken[token-1]',
          platform: DevicePlatform.ANDROID,
          provider: PushProvider.EXPO,
          deviceId: 'device-1',
        },
        {
          token: 'ExponentPushToken[token-2]',
          platform: DevicePlatform.IOS,
          provider: PushProvider.APNS,
          deviceId: 'device-2',
        },
      ];

      for (const token of tokens) {
        await request(app.getHttpServer())
          .post('/api/v1/device-tokens')
          .set('Authorization', `Bearer ${authToken}`)
          .send(token)
          .expect(201);
      }
    });

    it('should get user device tokens successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/device-tokens/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      response.body.forEach((token: any) => {
        expect(token).toMatchObject({
          id: expect.any(String),
          userId: expect.any(String),
          token: expect.any(String),
          platform: expect.any(String),
          provider: expect.any(String),
          deviceId: expect.any(String),
          isActive: expect.any(Boolean),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });
    });

    it('should return empty array when user has no tokens', async () => {
      // Use a different auth token for a user with no tokens
      const differentAuthToken = 'different-mock-jwt-token';

      const response = await request(app.getHttpServer())
        .get('/api/v1/device-tokens/me')
        .set('Authorization', `Bearer ${differentAuthToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 401 for missing authorization', async () => {
      await request(app.getHttpServer()).get('/api/v1/device-tokens/me').expect(401);
    });
  });
});
