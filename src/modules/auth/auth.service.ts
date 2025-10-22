import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthErrorDto } from './dto/auth-error.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authBaseUrl =
      this.configService.get<string>('AUTH_BASE_URL') || 'https://auth.cudanso.net';
  }

  async login(loginDto: AuthLoginDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`Attempting login for user: ${loginDto.identifier}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.authBaseUrl}/auth/login`, loginDto, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds timeout
        }),
      );

      this.logger.log(`Login successful for user: ${loginDto.identifier}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Login failed for user: ${loginDto.identifier}`, error);

      if (error.response) {
        // External API returned an error
        const statusCode = error.response.status;
        const errorData = error.response.data;

        throw new HttpException(
          {
            message: errorData?.message || 'Authentication failed',
            code: errorData?.code || 'AUTH_FAILED',
            statusCode,
          } as AuthErrorDto,
          statusCode,
        );
      } else if (error.code === 'ECONNABORTED') {
        // Timeout error
        throw new HttpException(
          {
            message: 'Authentication service timeout',
            code: 'AUTH_TIMEOUT',
            statusCode: HttpStatus.REQUEST_TIMEOUT,
          } as AuthErrorDto,
          HttpStatus.REQUEST_TIMEOUT,
        );
      } else {
        // Network or other errors
        throw new HttpException(
          {
            message: 'Authentication service unavailable',
            code: 'AUTH_SERVICE_UNAVAILABLE',
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          } as AuthErrorDto,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      this.logger.log('Validating token');

      const response = await firstValueFrom(
        this.httpService.get(`${this.authBaseUrl}/auth/validate`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000, // 5 seconds timeout
        }),
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      return false;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      this.logger.log('Refreshing token');

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authBaseUrl}/auth/refresh`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        ),
      );

      this.logger.log('Token refresh successful');
      return response.data;
    } catch (error) {
      this.logger.error('Token refresh failed', error);

      if (error.response) {
        const statusCode = error.response.status;
        const errorData = error.response.data;

        throw new HttpException(
          {
            message: errorData?.message || 'Token refresh failed',
            code: errorData?.code || 'REFRESH_FAILED',
            statusCode,
          } as AuthErrorDto,
          statusCode,
        );
      } else {
        throw new HttpException(
          {
            message: 'Authentication service unavailable',
            code: 'AUTH_SERVICE_UNAVAILABLE',
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          } as AuthErrorDto,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }
  }
}
