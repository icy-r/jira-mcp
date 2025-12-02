/**
 * Custom error classes for the Jira MCP server.
 * Provides structured error handling with proper error hierarchies.
 * @module utils/errors
 */

import type { ZodError } from 'zod';

/**
 * Base error class for all Jira MCP errors.
 * Extends the native Error class with additional context.
 */
export class JiraMcpError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  /** Additional context about the error */
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'JIRA_MCP_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'JiraMcpError';
    this.code = code;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts the error to a JSON-serializable object.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
    };
  }
}

/**
 * Error thrown when Jira API requests fail.
 */
export class JiraApiError extends JiraMcpError {
  /** HTTP status code from the API response */
  public readonly statusCode: number;
  /** Raw response body from the API */
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    statusCode: number,
    responseBody?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, 'JIRA_API_ERROR', context);
    this.name = 'JiraApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }

  /**
   * Creates an error from an HTTP response.
   */
  static async fromResponse(
    response: Response,
    context?: Record<string, unknown>
  ): Promise<JiraApiError> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => 'Unable to read response body');
    }

    const message = JiraApiError.extractMessage(body, response.statusText);
    return new JiraApiError(message, response.status, body, context);
  }

  /**
   * Extracts a human-readable message from the API response.
   */
  private static extractMessage(body: unknown, fallback: string): string {
    if (typeof body === 'object' && body !== null) {
      const obj = body as Record<string, unknown>;
      if (
        typeof obj['errorMessages'] === 'object' &&
        Array.isArray(obj['errorMessages'])
      ) {
        return (obj['errorMessages'] as string[]).join(', ');
      }
      if (typeof obj['message'] === 'string') {
        return obj['message'];
      }
      if (typeof obj['error'] === 'string') {
        return obj['error'];
      }
    }
    return fallback;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      responseBody: this.responseBody,
    };
  }
}

/**
 * Error thrown when input validation fails.
 */
export class ValidationError extends JiraMcpError {
  /** Validation errors by field */
  public readonly errors: Record<string, string[]>;

  constructor(
    message: string,
    errors: Record<string, string[]>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  /**
   * Creates a validation error from Zod errors.
   */
  static fromZodError(zodError: ZodError): ValidationError {
    const errors: Record<string, string[]> = {};
    for (const issue of zodError.issues) {
      const path = issue.path.join('.') || 'root';
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }
    return new ValidationError('Validation failed', errors);
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

/**
 * Error thrown when authentication fails.
 */
export class AuthenticationError extends JiraMcpError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when rate limiting is exceeded.
 */
export class RateLimitError extends JiraMcpError {
  /** Time in milliseconds until the rate limit resets */
  public readonly retryAfter: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter: number = 60000
  ) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Error thrown when a resource is not found.
 */
export class NotFoundError extends JiraMcpError {
  /** Type of resource that was not found */
  public readonly resourceType: string;
  /** Identifier of the resource */
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`, 'NOT_FOUND_ERROR', {
      resourceType,
      resourceId,
    });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Error thrown when configuration is invalid or missing.
 */
export class ConfigurationError extends JiraMcpError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

/**
 * Type guard to check if an error is a JiraMcpError.
 */
export function isJiraMcpError(error: unknown): error is JiraMcpError {
  return error instanceof JiraMcpError;
}

/**
 * Formats an error for MCP response.
 */
export function formatErrorForMcp(error: unknown): {
  content: string;
  isError: true;
} {
  if (isJiraMcpError(error)) {
    return {
      content: `Error [${error.code}]: ${error.message}`,
      isError: true,
    };
  }
  if (error instanceof Error) {
    return {
      content: `Error: ${error.message}`,
      isError: true,
    };
  }
  return {
    content: `Unknown error: ${String(error)}`,
    isError: true,
  };
}
