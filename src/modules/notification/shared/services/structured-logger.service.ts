import { Injectable, Logger } from '@nestjs/common';

export interface LogContext {
  [key: string]: any;
}

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger(StructuredLoggerService.name);

  log(message: string, context?: LogContext): void {
    const structuredMessage = this.formatMessage(message, context);
    this.logger.log(structuredMessage);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const structuredMessage = this.formatMessage(message, context);
    this.logger.error(structuredMessage, error?.stack);
  }

  warn(message: string, context?: LogContext): void {
    const structuredMessage = this.formatMessage(message, context);
    this.logger.warn(structuredMessage);
  }

  debug(message: string, context?: LogContext): void {
    const structuredMessage = this.formatMessage(message, context);
    this.logger.debug(structuredMessage);
  }

  logSecurityEvent(event: string, context?: LogContext): void {
    this.log(`Security event: ${event}`, context);
  }

  logBusinessEvent(event: string, context?: LogContext): void {
    this.log(`Business event: ${event}`, context);
  }

  logMessageQueueOperation(
    operation: string,
    queueType: string,
    messageId: string,
    context?: LogContext,
  ): void {
    this.log(`Queue operation: ${operation}`, {
      ...context,
    });
  }

  private formatMessage(message: string, context?: LogContext): string {
    if (!context) {
      return message;
    }

    const contextStr = Object.entries(context)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ');

    return `${message} ${contextStr}`.trim();
  }
}
