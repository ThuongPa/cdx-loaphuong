import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PreferencesController } from './preferences.controller';
import { UserPreferences } from '../domain/user-preferences.entity';

describe('PreferencesController', () => {
  let controller: PreferencesController;
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
      controllers: [PreferencesController],
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

    controller = module.get<PreferencesController>(PreferencesController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const userId = 'user_123';
      const preferences = UserPreferences.createDefault(userId);

      queryBus.execute.mockResolvedValue(preferences);

      const result = await controller.getPreferences(userId);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe(userId);
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const userId = 'user_123';
      const preferences = UserPreferences.createDefault(userId);
      const updatedPreferences = preferences.updateChannelPreferences({ push: false });

      commandBus.execute.mockResolvedValue(updatedPreferences);

      const result = await controller.updatePreferences(userId, {
        channels: { push: false },
      });

      expect(result.success).toBe(true);
      expect(result.data.channels.push).toBe(false);
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(Object));
    });
  });
});
