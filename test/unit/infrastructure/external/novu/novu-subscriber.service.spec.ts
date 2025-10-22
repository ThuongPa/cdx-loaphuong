import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NovuSubscriberService } from '../../../../../src/infrastructure/external/novu/novu-subscriber.service';
import { NovuClient } from '../../../../../src/infrastructure/external/novu/novu.client';
import { AuthServiceClient } from '../../../../../src/infrastructure/external/auth-service/auth-service.client';

describe('NovuSubscriberService', () => {
  let service: NovuSubscriberService;
  let novuClient: jest.Mocked<NovuClient>;
  let authServiceClient: jest.Mocked<AuthServiceClient>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockNovuClient = {
      createSubscriber: jest.fn(),
      updateSubscriber: jest.fn(),
      getSubscriber: jest.fn(),
      deleteSubscriber: jest.fn(),
    };

    const mockAuthServiceClient = {
      getUserById: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NovuSubscriberService,
        {
          provide: NovuClient,
          useValue: mockNovuClient,
        },
        {
          provide: AuthServiceClient,
          useValue: mockAuthServiceClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NovuSubscriberService>(NovuSubscriberService);
    novuClient = module.get(NovuClient);
    authServiceClient = module.get(AuthServiceClient);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscriberFromUser', () => {
    it('should create subscriber from user data successfully', async () => {
      const userId = 'user123';
      const userData = {
        id: userId,
        email: 'test@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['user'],
        isActive: true,
        lastSyncedAt: new Date(),
      };

      authServiceClient.getUserById.mockResolvedValue(userData);
      novuClient.createSubscriber.mockResolvedValue(undefined);

      await service.createSubscriberFromUser(userId);

      expect(authServiceClient.getUserById).toHaveBeenCalledWith(userId);
      expect(novuClient.createSubscriber).toHaveBeenCalledWith({
        subscriberId: userId,
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName,
        lastName: userData.lastName,
        data: {
          roles: userData.roles,
          createdAt: expect.any(String),
        },
      });
    });

    it('should throw error when user not found', async () => {
      const userId = 'user123';

      authServiceClient.getUserById.mockResolvedValue(null as any);

      await expect(service.createSubscriberFromUser(userId)).rejects.toThrow(
        'User not found: user123',
      );
    });

    it('should handle auth service error', async () => {
      const userId = 'user123';
      const error = new Error('Auth service error');

      authServiceClient.getUserById.mockRejectedValue(error);

      await expect(service.createSubscriberFromUser(userId)).rejects.toThrow(error);
    });
  });

  describe('syncSubscriberFromAuthService', () => {
    it('should sync subscriber data successfully', async () => {
      const userId = 'user123';
      const userData = {
        id: userId,
        email: 'newemail@example.com',
        phone: '+0987654321',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: ['admin'],
        isActive: true,
        lastSyncedAt: new Date(),
      };

      authServiceClient.getUserById.mockResolvedValue(userData);
      novuClient.updateSubscriber.mockResolvedValue(undefined);

      await service.syncSubscriberFromAuthService(userId);

      expect(authServiceClient.getUserById).toHaveBeenCalledWith(userId);
      expect(novuClient.updateSubscriber).toHaveBeenCalledWith(userId, {
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName,
        lastName: userData.lastName,
        data: {
          roles: userData.roles,
          lastSyncAt: expect.any(String),
        },
      });
    });

    it('should handle user not found gracefully', async () => {
      const userId = 'user123';

      authServiceClient.getUserById.mockResolvedValue(null as any);

      await service.syncSubscriberFromAuthService(userId);

      expect(novuClient.updateSubscriber).not.toHaveBeenCalled();
    });
  });

  describe('updateSubscriberPreferences', () => {
    it('should update subscriber preferences successfully', async () => {
      const userId = 'user123';
      const preferences = {
        channels: ['push', 'email'],
        types: ['marketing', 'transactional'],
        frequency: 'daily',
      };

      novuClient.updateSubscriber.mockResolvedValue(undefined);

      await service.updateSubscriberPreferences(userId, preferences);

      expect(novuClient.updateSubscriber).toHaveBeenCalledWith(userId, {
        data: {
          preferences: {
            channels: preferences.channels,
            types: preferences.types,
            frequency: preferences.frequency,
            updatedAt: expect.any(String),
          },
        },
      });
    });
  });

  describe('getSubscriber', () => {
    it('should get subscriber data successfully', async () => {
      const userId = 'user123';
      const mockSubscriber = {
        subscriberId: userId,
        email: 'test@example.com',
      };

      novuClient.getSubscriber.mockResolvedValue(mockSubscriber);

      const result = await service.getSubscriber(userId);

      expect(result).toEqual(mockSubscriber);
      expect(novuClient.getSubscriber).toHaveBeenCalledWith(userId);
    });
  });

  describe('deleteSubscriber', () => {
    it('should delete subscriber successfully', async () => {
      const userId = 'user123';

      novuClient.deleteSubscriber.mockResolvedValue(undefined);

      await service.deleteSubscriber(userId);

      expect(novuClient.deleteSubscriber).toHaveBeenCalledWith(userId);
    });
  });

  describe('subscriberExists', () => {
    it('should return true when subscriber exists', async () => {
      const userId = 'user123';
      const mockSubscriber = {
        subscriberId: userId,
        email: 'test@example.com',
      };

      novuClient.getSubscriber.mockResolvedValue(mockSubscriber);

      const result = await service.subscriberExists(userId);

      expect(result).toBe(true);
    });

    it('should return false when subscriber not found', async () => {
      const userId = 'user123';
      const error = new Error('not found');
      error.message = 'not found';

      novuClient.getSubscriber.mockRejectedValue(error);

      const result = await service.subscriberExists(userId);

      expect(result).toBe(false);
    });

    it('should return false when subscriber not found (404 status)', async () => {
      const userId = 'user123';
      const error = new Error('Not found') as any;
      error.status = 404;

      novuClient.getSubscriber.mockRejectedValue(error);

      const result = await service.subscriberExists(userId);

      expect(result).toBe(false);
    });

    it('should throw error for other errors', async () => {
      const userId = 'user123';
      const error = new Error('Server error') as any;
      error.status = 500;

      novuClient.getSubscriber.mockRejectedValue(error);

      await expect(service.subscriberExists(userId)).rejects.toThrow(error);
    });
  });
});
