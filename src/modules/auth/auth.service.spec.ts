import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://auth.cudanso.net'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: AuthLoginDto = {
      identifier: 'admin',
      password: 'Admin123!',
    };

    const mockAuthResponse = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'user-id',
        role: 'ADMIN_XA',
        fullName: 'System Administrator',
        isFirstLogin: false,
      },
    };

    it('should successfully login with valid credentials', async () => {
      mockHttpService.post.mockReturnValue(of({ data: mockAuthResponse }));

      const result = await service.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://auth.cudanso.net/auth/login',
        loginDto,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );
    });

    it('should throw HttpException when external API returns error', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS',
          },
        },
      };

      mockHttpService.post.mockReturnValue(throwError(() => errorResponse));

      await expect(service.login(loginDto)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException when request times out', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout',
      };

      mockHttpService.post.mockReturnValue(throwError(() => timeoutError));

      await expect(service.login(loginDto)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException when service is unavailable', async () => {
      const networkError = {
        message: 'Network Error',
      };

      mockHttpService.post.mockReturnValue(throwError(() => networkError));

      await expect(service.login(loginDto)).rejects.toThrow(HttpException);
    });
  });

  describe('validateToken', () => {
    const token = 'mock-token';

    it('should return true for valid token', async () => {
      mockHttpService.get.mockReturnValue(of({ status: 200 }));

      const result = await service.validateToken(token);

      expect(result).toBe(true);
      expect(mockHttpService.get).toHaveBeenCalledWith('https://auth.cudanso.net/auth/validate', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
    });

    it('should return false for invalid token', async () => {
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Invalid token')));

      const result = await service.validateToken(token);

      expect(result).toBe(false);
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'mock-refresh-token';
    const mockAuthResponse = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 'user-id',
        role: 'ADMIN_XA',
        fullName: 'System Administrator',
        isFirstLogin: false,
      },
    };

    it('should successfully refresh token', async () => {
      mockHttpService.post.mockReturnValue(of({ data: mockAuthResponse }));

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual(mockAuthResponse);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://auth.cudanso.net/auth/refresh',
        { refreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );
    });

    it('should throw HttpException when refresh fails', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            message: 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN',
          },
        },
      };

      mockHttpService.post.mockReturnValue(throwError(() => errorResponse));

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(HttpException);
    });
  });
});
