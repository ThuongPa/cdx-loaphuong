export const ERROR_MESSAGES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Insufficient permissions',
  TOKEN_INVALID: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  USER_NOT_FOUND: 'User not found',

  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_INPUT: 'Invalid input data',
  REQUIRED_FIELD: 'Required field is missing',
  INVALID_FORMAT: 'Invalid format',

  // Database
  DATABASE_ERROR: 'Database operation failed',
  RECORD_NOT_FOUND: 'Record not found',
  DUPLICATE_RECORD: 'Record already exists',
  CONSTRAINT_VIOLATION: 'Database constraint violation',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'External service error',
  SERVICE_UNAVAILABLE: 'Service unavailable',
  TIMEOUT_ERROR: 'Request timeout',
  CIRCUIT_BREAKER_OPEN: 'Circuit breaker is open',

  // Notifications
  NOTIFICATION_SEND_FAILED: 'Failed to send notification',
  TEMPLATE_NOT_FOUND: 'Template not found',
  INVALID_CHANNEL: 'Invalid notification channel',
  USER_PREFERENCES_NOT_FOUND: 'User preferences not found',

  // General
  INTERNAL_ERROR: 'Internal server error',
  NOT_IMPLEMENTED: 'Feature not implemented',
  BAD_REQUEST: 'Bad request',
  NOT_FOUND: 'Resource not found',
} as const;

export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',

  // Notifications
  NOTIFICATION_SEND_FAILED: 'NOTIFICATION_SEND_FAILED',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  INVALID_CHANNEL: 'INVALID_CHANNEL',
  USER_PREFERENCES_NOT_FOUND: 'USER_PREFERENCES_NOT_FOUND',

  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
} as const;
