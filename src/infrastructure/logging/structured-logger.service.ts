import { format } from 'winston';
import { Injectable, Get, Query, Logger } from '@nestjs/common';
import { Type } from 'class-transformer';
import * as winston from 'winston';

export interface LogContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  service?: string;
  version?: string;
  environment?: string;
  [key: string]: any;
}

@Injectable()
export class StructuredLoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS',
        }),
        format.errors({ stack: true }),
        format.json(),
        format.printf(({ timestamp, level, message, context, ...rest }) => {
          const logEntry = {
            timestamp,
            level,
            message,
            context,
            ...rest,
          };
          return JSON.stringify(logEntry);
        }),
      ),
      defaultMeta: {
        service: 'cdx-notification-service',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      transports: [
        new winston.transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });

    // Add request logging middleware
    this.setupRequestLogging();
  }

  private setupRequestLogging(): void {
    // This will be used by the request logging interceptor
  }

  log(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.info(message, { context });
    } else {
      this.logger.info(message, context);
    }
  }

  error(message: string, trace?: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.error(message, { context, trace });
    } else {
      this.logger.error(message, { ...context, trace });
    }
  }

  warn(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.warn(message, { context });
    } else {
      this.logger.warn(message, context);
    }
  }

  debug(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.debug(message, { context });
    } else {
      this.logger.debug(message, context);
    }
  }

  verbose(message: string, context?: string | LogContext): void {
    if (typeof context === 'string') {
      this.logger.verbose(message, { context });
    } else {
      this.logger.verbose(message, context);
    }
  }

  // Structured logging methods
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context?: LogContext,
  ): void {
    this.logger.info('HTTP Request', {
      type: 'http_request',
      method,
      url,
      statusCode,
      responseTime,
      ...context,
    });
  }

  logNotificationSent(
    notificationId: string,
    userId: string,
    type: string,
    channel: string,
    context?: LogContext,
  ): void {
    this.logger.info('Notification Sent', {
      type: 'notification_sent',
      notificationId,
      userId,
      notificationType: type,
      channel,
      ...context,
    });
  }

  logNotificationFailed(
    notificationId: string,
    userId: string,
    error: string,
    context?: LogContext,
  ): void {
    this.logger.error('Notification Failed', {
      type: 'notification_failed',
      notificationId,
      userId,
      error,
      ...context,
    });
  }

  logDatabaseQuery(
    operation: string,
    collection: string,
    duration: number,
    context?: LogContext,
  ): void {
    this.logger.debug('Database Query', {
      type: 'database_query',
      operation,
      collection,
      duration,
      ...context,
    });
  }

  logCacheOperation(operation: string, key: string, hit: boolean, context?: LogContext): void {
    this.logger.debug('Cache Operation', {
      type: 'cache_operation',
      operation,
      key,
      hit,
      ...context,
    });
  }

  logMessageQueueOperation(
    operation: string,
    queueName: string,
    messageId: string,
    context?: LogContext,
  ): void {
    this.logger.info('Message Queue Operation', {
      type: 'message_queue_operation',
      operation,
      queueName,
      messageId,
      ...context,
    });
  }

  logSecurityEvent(event: string, details: any, context?: LogContext): void {
    this.logger.warn('Security Event', {
      type: 'security_event',
      event,
      details,
      ...context,
    });
  }

  logPerformanceMetric(metric: string, value: number, unit: string, context?: LogContext): void {
    this.logger.info('Performance Metric', {
      type: 'performance_metric',
      metric,
      value,
      unit,
      ...context,
    });
  }

  logBusinessEvent(event: string, details: any, context?: LogContext): void {
    this.logger.info('Business Event', {
      type: 'business_event',
      event,
      details,
      ...context,
    });
  }

  // Health check logging
  logHealthCheck(component: string, status: string, responseTime: number, details?: any): void {
    this.logger.info('Health Check', {
      type: 'health_check',
      component,
      status,
      responseTime,
      details,
    });
  }

  // Error logging with context
  logError(error: Error, context?: LogContext): void {
    this.logger.error('Application Error', {
      type: 'application_error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  }

  // Get the underlying winston logger for advanced usage
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}
