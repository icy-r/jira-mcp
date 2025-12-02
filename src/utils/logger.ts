/**
 * Logging utility for the Jira MCP server.
 * Provides structured logging with configurable log levels.
 * @module utils/logger
 */

import type { LogLevel } from '../types/index.js';

/**
 * Log level priority mapping.
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Sensitive keys that should be redacted from logs.
 */
const SENSITIVE_KEYS = [
  'apiToken',
  'api_token',
  'password',
  'secret',
  'authorization',
  'token',
  'key',
  'credential',
];

/**
 * Logger class for structured logging.
 */
export class Logger {
  private readonly name: string;
  private level: LogLevel;

  constructor(name: string, level: LogLevel = 'info') {
    this.name = name;
    this.level = level;
  }

  /**
   * Sets the log level.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Checks if a log level should be output.
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  /**
   * Formats a log message with timestamp and context.
   */
  private format(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.sanitize(context) : undefined;
    const contextStr = sanitizedContext
      ? ` ${JSON.stringify(sanitizedContext)}`
      : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}${contextStr}`;
  }

  /**
   * Sanitizes sensitive data from log context.
   */
  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Logs a debug message.
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, context));
    }
  }

  /**
   * Logs an info message.
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.format('info', message, context));
    }
  }

  /**
   * Logs a warning message.
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, context));
    }
  }

  /**
   * Logs an error message.
   */
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    if (this.shouldLog('error')) {
      const errorContext = error
        ? {
            ...context,
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n'),
          }
        : context;
      console.error(this.format('error', message, errorContext));
    }
  }

  /**
   * Creates a child logger with a prefixed name.
   */
  child(name: string): Logger {
    return new Logger(`${this.name}:${name}`, this.level);
  }
}

/**
 * Default logger instance.
 */
export const logger = new Logger('jira-mcp');

/**
 * Creates a logger for a specific module.
 */
export function createLogger(name: string): Logger {
  return logger.child(name);
}
