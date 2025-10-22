import { Injectable, Logger } from '@nestjs/common';

export interface LogContext {
  [key: string]: any;
}

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger(StructuredLoggerService.name);

  log(message: string, context?: LogContext): void {
    this.logger.log(message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, error?.stack, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: LogContext): void {
    this.logger.verbose(message, context);
  }

  logBusinessEvent(event: string, data: any): void {
    this.logger.log('Business Event: ' + event, { event, data });
  }
}