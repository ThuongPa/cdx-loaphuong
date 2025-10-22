export const CACHE_KEYS = {
  // User related
  USER: 'user',
  USER_PREFERENCES: 'user:preferences',
  USER_NOTIFICATIONS: 'user:notifications',
  USER_DEVICE_TOKENS: 'user:device:tokens',

  // Notification related
  NOTIFICATION: 'notification',
  NOTIFICATION_TEMPLATE: 'notification:template',
  NOTIFICATION_ANNOUNCEMENT: 'notification:announcement',

  // Category related
  CATEGORY: 'category',
  CATEGORY_MEMBERS: 'category:members',

  // System related
  HEALTH_CHECK: 'health:check',
  SYSTEM_CONFIG: 'system:config',
} as const;

export const CACHE_TTL = {
  // User related (30 minutes)
  USER: 1800,
  USER_PREFERENCES: 1800,
  USER_NOTIFICATIONS: 1800,
  USER_DEVICE_TOKENS: 1800,

  // Notification related (1 hour)
  NOTIFICATION: 3600,
  NOTIFICATION_TEMPLATE: 3600,
  NOTIFICATION_ANNOUNCEMENT: 3600,

  // Category related (1 hour)
  CATEGORY: 3600,
  CATEGORY_MEMBERS: 3600,

  // System related (5 minutes)
  HEALTH_CHECK: 300,
  SYSTEM_CONFIG: 300,
} as const;

export const CACHE_PATTERNS = {
  USER_ALL: 'user:*',
  USER_NOTIFICATIONS_ALL: 'user:notifications:*',
  NOTIFICATION_ALL: 'notification:*',
  CATEGORY_ALL: 'category:*',
  SYSTEM_ALL: 'system:*',
} as const;
