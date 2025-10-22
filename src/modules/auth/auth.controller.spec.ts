import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    validateToken: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: AuthLoginDto = {
      identifier: 'admin',
      password: 'Admin123!',
    };

    const mockAuthResponse: AuthResponseDto = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'user-id',
        role: 'ADMIN_XA',
        fullName: 'System Administrator',
        isFirstLogin: false,
      },
    };

    it('should successfully login and return auth response', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw HttpException when login fails', async () => {
      const error = new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      mockAuthService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(HttpException);
    });
  });

  describe('validateToken', () => {
    it('should return valid: true for valid token', async () => {
      const authorization = 'Bearer valid-token';
      mockAuthService.validateToken.mockResolvedValue(true);

      const result = await controller.validateToken(authorization);

      expect(result).toEqual({ valid: true });
      expect(authService.validateToken).toHaveBeenCalledWith('valid-token');
    });

    it('should return valid: false for invalid token', async () => {
      const authorization = 'Bearer invalid-token';
      mockAuthService.validateToken.mockResolvedValue(false);

      const result = await controller.validateToken(authorization);

      expect(result).toEqual({ valid: false });
      expect(authService.validateToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should return valid: false for missing authorization header', async () => {
      const result = await controller.validateToken(undefined as any);

      expect(result).toEqual({ valid: false });
      expect(authService.validateToken).not.toHaveBeenCalled();
    });

    it('should return valid: false for malformed authorization header', async () => {
      const authorization = 'InvalidFormat token';

      const result = await controller.validateToken(authorization);

      expect(result).toEqual({ valid: false });
      expect(authService.validateToken).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'mock-refresh-token';
    const mockAuthResponse: AuthResponseDto = {
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
      mockAuthService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refreshToken(refreshToken);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should throw HttpException when refresh fails', async () => {
      const error = new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      mockAuthService.refreshToken.mockRejectedValue(error);

      await expect(controller.refreshToken(refreshToken)).rejects.toThrow(HttpException);
    });
  });
});
