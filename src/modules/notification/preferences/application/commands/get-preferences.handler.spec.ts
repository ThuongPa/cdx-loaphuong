import { Test, TestingModule } from '@nestjs/testing';
import { GetPreferencesHandler } from './get-preferences.handler';
import { UserPreferences } from '../../domain/user-preferences.entity';

describe('GetPreferencesHandler', () => {
  let handler: GetPreferencesHandler;
  let mockRepository: jest.Mocked<any>;

  beforeEach(async () => {
    mockRepository = {
      findByUserId: jest.fn(),
      createDefault: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPreferencesHandler,
        {
          provide: 'UserPreferencesRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<GetPreferencesHandler>(GetPreferencesHandler);
  });

  describe('execute', () => {
    it('should return existing preferences when found', async () => {
      const userId = 'user_123';
      const existingPreferences = UserPreferences.createDefault(userId);

      mockRepository.findByUserId.mockResolvedValue(existingPreferences);

      const result = await handler.execute({ userId });

      expect(result).toBe(existingPreferences);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockRepository.createDefault).not.toHaveBeenCalled();
    });

    it('should create default preferences when not found', async () => {
      const userId = 'user_123';
      const defaultPreferences = UserPreferences.createDefault(userId);

      mockRepository.findByUserId.mockResolvedValue(null);
      mockRepository.createDefault.mockResolvedValue(defaultPreferences);

      const result = await handler.execute({ userId });

      expect(result).toBe(defaultPreferences);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockRepository.createDefault).toHaveBeenCalledWith(userId);
    });
  });
});
