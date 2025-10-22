import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UpdatePreferencesHandler } from './update-preferences.handler';
import { UserPreferences } from '../../domain/user-preferences.entity';

describe('UpdatePreferencesHandler', () => {
  let handler: UpdatePreferencesHandler;
  let mockRepository: jest.Mocked<any>;

  beforeEach(async () => {
    mockRepository = {
      findByUserId: jest.fn(),
      createDefault: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdatePreferencesHandler,
        {
          provide: 'UserPreferencesRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<UpdatePreferencesHandler>(UpdatePreferencesHandler);
  });

  describe('execute', () => {
    it('should update existing preferences', async () => {
      const userId = 'user_123';
      const existingPreferences = UserPreferences.createDefault(userId);
      const updatedPreferences = existingPreferences.updateChannelPreferences({ push: false });

      mockRepository.findByUserId.mockResolvedValue(existingPreferences);
      mockRepository.save.mockResolvedValue(updatedPreferences);

      const result = await handler.execute({
        userId,
        channels: { push: false },
      });

      expect(result).toBe(updatedPreferences);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          channelPreferences: expect.objectContaining({ push: false }),
        }),
      );
    });

    it('should create default preferences when not found', async () => {
      const userId = 'user_123';
      const defaultPreferences = UserPreferences.createDefault(userId);
      const updatedPreferences = defaultPreferences.updateChannelPreferences({ push: false });

      mockRepository.findByUserId.mockResolvedValue(null);
      mockRepository.createDefault.mockResolvedValue(defaultPreferences);
      mockRepository.save.mockResolvedValue(updatedPreferences);

      const result = await handler.execute({
        userId,
        channels: { push: false },
      });

      expect(result).toBe(updatedPreferences);
      expect(mockRepository.createDefault).toHaveBeenCalledWith(userId);
    });

    it('should throw error when trying to disable emergency notifications', async () => {
      const userId = 'user_123';
      const existingPreferences = UserPreferences.createDefault(userId);

      mockRepository.findByUserId.mockResolvedValue(existingPreferences);

      await expect(
        handler.execute({
          userId,
          types: { emergency: false },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow partial updates', async () => {
      const userId = 'user_123';
      const existingPreferences = UserPreferences.createDefault(userId);
      const updatedPreferences = existingPreferences.updateChannelPreferences({ push: false });

      mockRepository.findByUserId.mockResolvedValue(existingPreferences);
      mockRepository.save.mockResolvedValue(updatedPreferences);

      const result = await handler.execute({
        userId,
        channels: { push: false },
      });

      expect(result).toBe(updatedPreferences);
    });
  });
});
