import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { AuthServiceClient } from './auth-service.client';
import { of, throwError } from 'rxjs';

describe('AuthServiceClient', () => {
  let service: AuthServiceClient;
  let httpService: HttpService;
  let configService: ConfigService;
  let circuitBreakerService: CircuitBreakerService;

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, any> = {
        AUTH_BASE_URL: 'https://auth.cudanso.net',
        AUTH_SERVICE_TIMEOUT: 10000,
        AUTH_SERVICE_RETRIES: 3,
      };
      return config[key];
    }),
  };

  const mockCircuitBreakerService = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceClient,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
      ],
    }).compile();

    service = module.get<AuthServiceClient>(AuthServiceClient);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    circuitBreakerService = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsersByRole', () => {
    it('should call auth service API and return users', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          role: 'ADMIN_XA',
          fullName: 'Admin User',
        },
      ];

      mockCircuitBreakerService.execute.mockImplementation(async (serviceName, fn) => {
        return fn();
      });

      mockHttpService.get.mockReturnValue(of({ data: mockUsers }));

      const result = await service.getUsersByRole('ADMIN_XA');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user1');
      expect(result[0].email).toBe('user1@example.com');
      expect(result[0].roles).toEqual(['ADMIN_XA']);
      expect(mockHttpService.get).toHaveBeenCalledWith('https://auth.cudanso.net/users/by-role', {
        params: { role: 'ADMIN_XA' },
        timeout: 10000,
      });
    });

    it('should return empty array when API fails', async () => {
      mockCircuitBreakerService.execute.mockImplementation(async (serviceName, fn) => {
        return fn();
      });

      mockHttpService.get.mockReturnValue(throwError(() => new Error('API Error')));

      const result = await service.getUsersByRole('ADMIN_XA');

      expect(result).toEqual([]);
    });
  });

  describe('validateToken', () => {
    it('should call auth service API and return user', async () => {
      const mockUserData = {
        id: 'user123',
        email: 'user@example.com',
        role: 'ADMIN_XA',
        fullName: 'Test User',
      };

      mockCircuitBreakerService.execute.mockImplementation(async (serviceName, fn) => {
        return fn();
      });

      mockHttpService.get.mockReturnValue(of({ data: mockUserData }));

      const result = await service.validateToken('valid-token');

      expect(result.id).toBe('user123');
      expect(result.email).toBe('user@example.com');
      expect(result.roles).toEqual(['ADMIN_XA']);
      expect(mockHttpService.get).toHaveBeenCalledWith('https://auth.cudanso.net/auth/validate', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
        timeout: 10000,
      });
    });
  });
});
