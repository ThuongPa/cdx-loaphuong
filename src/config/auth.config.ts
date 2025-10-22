import { registerAs } from '@nestjs/config';

export const AuthConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  authServiceTimeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000', 10),
  authServiceRetries: parseInt(process.env.AUTH_SERVICE_RETRIES || '3', 10),
}));
