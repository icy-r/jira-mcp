/**
 * Tests for error utilities.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  JiraMcpError,
  JiraApiError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ConfigurationError,
  isJiraMcpError,
  formatErrorForMcp,
} from '../../../src/utils/errors.js';

describe('JiraMcpError', () => {
  it('should create error with message and code', () => {
    const error = new JiraMcpError('Test error', 'TEST_CODE');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('JiraMcpError');
  });

  it('should create error with context', () => {
    const error = new JiraMcpError('Test error', 'TEST_CODE', { key: 'value' });

    expect(error.context).toEqual({ key: 'value' });
  });

  it('should serialize to JSON', () => {
    const error = new JiraMcpError('Test error', 'TEST_CODE', { key: 'value' });
    const json = error.toJSON();

    expect(json).toEqual({
      name: 'JiraMcpError',
      message: 'Test error',
      code: 'TEST_CODE',
      context: { key: 'value' },
    });
  });
});

describe('JiraApiError', () => {
  it('should create error with status code', () => {
    const error = new JiraApiError('API error', 404);

    expect(error.message).toBe('API error');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('JIRA_API_ERROR');
  });

  it('should include response body', () => {
    const body = { errorMessages: ['Not found'] };
    const error = new JiraApiError('API error', 404, body);

    expect(error.responseBody).toEqual(body);
  });

  it('should serialize to JSON with status code', () => {
    const error = new JiraApiError('API error', 500, { error: 'Internal' });
    const json = error.toJSON();

    expect(json.statusCode).toBe(500);
    expect(json.responseBody).toEqual({ error: 'Internal' });
  });
});

describe('ValidationError', () => {
  it('should create error with field errors', () => {
    const errors = {
      email: ['Invalid email format'],
      name: ['Name is required'],
    };
    const error = new ValidationError('Validation failed', errors);

    expect(error.errors).toEqual(errors);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should create from Zod error', () => {
    // Create a real Zod schema and parse invalid data to get a ZodError
    const schema = z.object({
      email: z.string().email(),
      name: z.object({
        first: z.string().min(1),
      }),
    });

    const result = schema.safeParse({ email: 'invalid', name: {} });
    expect(result.success).toBe(false);

    if (!result.success) {
      const error = ValidationError.fromZodError(result.error);
      expect(error.errors).toBeDefined();
      expect(Object.keys(error.errors).length).toBeGreaterThan(0);
    }
  });
});

describe('AuthenticationError', () => {
  it('should create with default message', () => {
    const error = new AuthenticationError();

    expect(error.message).toBe('Authentication failed');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should create with custom message', () => {
    const error = new AuthenticationError('Invalid token');

    expect(error.message).toBe('Invalid token');
  });
});

describe('RateLimitError', () => {
  it('should create with retry after', () => {
    const error = new RateLimitError('Too many requests', 30000);

    expect(error.retryAfter).toBe(30000);
    expect(error.code).toBe('RATE_LIMIT_ERROR');
  });

  it('should use default retry after', () => {
    const error = new RateLimitError();

    expect(error.retryAfter).toBe(60000);
  });
});

describe('NotFoundError', () => {
  it('should create with resource info', () => {
    const error = new NotFoundError('Issue', 'PROJ-123');

    expect(error.resourceType).toBe('Issue');
    expect(error.resourceId).toBe('PROJ-123');
    expect(error.message).toBe('Issue not found: PROJ-123');
  });
});

describe('ConfigurationError', () => {
  it('should create with message', () => {
    const error = new ConfigurationError('Missing API token');

    expect(error.message).toBe('Missing API token');
    expect(error.code).toBe('CONFIGURATION_ERROR');
  });
});

describe('isJiraMcpError', () => {
  it('should return true for JiraMcpError instances', () => {
    expect(isJiraMcpError(new JiraMcpError('test'))).toBe(true);
    expect(isJiraMcpError(new JiraApiError('test', 404))).toBe(true);
    expect(isJiraMcpError(new ValidationError('test', {}))).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(isJiraMcpError(new Error('test'))).toBe(false);
    expect(isJiraMcpError('string error')).toBe(false);
    expect(isJiraMcpError(null)).toBe(false);
  });
});

describe('formatErrorForMcp', () => {
  it('should format JiraMcpError', () => {
    const error = new JiraMcpError('Test error', 'TEST_CODE');
    const result = formatErrorForMcp(error);

    expect(result.content).toBe('Error [TEST_CODE]: Test error');
    expect(result.isError).toBe(true);
  });

  it('should format regular Error', () => {
    const error = new Error('Regular error');
    const result = formatErrorForMcp(error);

    expect(result.content).toBe('Error: Regular error');
    expect(result.isError).toBe(true);
  });

  it('should format unknown error', () => {
    const result = formatErrorForMcp('string error');

    expect(result.content).toBe('Unknown error: string error');
    expect(result.isError).toBe(true);
  });
});
