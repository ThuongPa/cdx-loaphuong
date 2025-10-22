import { registerAs } from '@nestjs/config';

export const NovuConfig = registerAs('novu', () => ({
  apiKey: process.env.NOVU_API_KEY,
  secretKey: process.env.NOVU_SECRET_KEY,
  apiUrl: process.env.NOVU_API_URL || 'http://localhost:3001',
  applicationIdentifier: process.env.NOVU_APPLICATION_IDENTIFIER,
  webhookUrl: process.env.NOVU_WEBHOOK_URL,
  timeout: parseInt(process.env.NOVU_TIMEOUT || '30000', 10),
  retries: parseInt(process.env.NOVU_RETRIES || '3', 10),
}));
