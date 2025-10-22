export const APP_CONSTANTS = {
  NAME: 'Notification Service',
  VERSION: '1.0.0',
  DESCRIPTION: 'CDX Loap Huong Notification Service',
  AUTHOR: 'CDX Development Team',
} as const;

export const API_CONSTANTS = {
  PREFIX: 'api/v1',
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

export const CACHE_CONSTANTS = {
  DEFAULT_TTL: 300, // 5 minutes
  MAX_TTL: 3600, // 1 hour
  USER_SESSION_TTL: 1800, // 30 minutes
  NOTIFICATION_TTL: 86400, // 24 hours
} as const;
