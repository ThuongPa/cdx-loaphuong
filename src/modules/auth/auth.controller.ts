import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Headers,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthErrorDto } from './dto/auth-error.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with identifier and password',
  })
  @ApiBody({ type: AuthLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    type: AuthErrorDto,
  })
  @ApiResponse({
    status: 408,
    description: 'Authentication service timeout',
    type: AuthErrorDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Authentication service unavailable',
    type: AuthErrorDto,
  })
  async login(@Body() loginDto: AuthLoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('validate')
  @ApiOperation({
    summary: 'Validate token',
    description: 'Validate if the provided token is valid',
  })
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid token',
    type: AuthErrorDto,
  })
  async validateToken(@Headers('authorization') authorization: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return { valid: false };
    }

    const token = authorization.substring(7);
    const isValid = await this.authService.validateToken(token);
    return { valid: isValid };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh token',
    description: 'Refresh access token using refresh token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token',
          example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refresh successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
    type: AuthErrorDto,
  })
  @ApiResponse({
    status: 408,
    description: 'Authentication service timeout',
    type: AuthErrorDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Authentication service unavailable',
    type: AuthErrorDto,
  })
  async refreshToken(@Body('refreshToken') refreshToken: string): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshToken);
  }
}
