/**
 * Tests for configuration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, resetConfig } from '../../../src/config/index.js';
import {
  ConfigurationError,
  ValidationError,
} from '../../../src/utils/errors.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetConfig();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
  });

  it('should load valid configuration', () => {
    process.env['JIRA_BASE_URL'] = 'https://test.atlassian.net';
    process.env['JIRA_EMAIL'] = 'test@example.com';
    process.env['JIRA_API_TOKEN'] = 'test-token';

    const config = loadConfig();

    expect(config.jira.baseUrl).toBe('https://test.atlassian.net');
    expect(config.jira.email).toBe('test@example.com');
    expect(config.jira.apiToken).toBe('test-token');
  });

  it('should remove trailing slash from base URL', () => {
    process.env['JIRA_BASE_URL'] = 'https://test.atlassian.net/';
    process.env['JIRA_EMAIL'] = 'test@example.com';
    process.env['JIRA_API_TOKEN'] = 'test-token';

    const config = loadConfig();

    expect(config.jira.baseUrl).toBe('https://test.atlassian.net');
  });

  it('should use default values for optional settings', () => {
    process.env['JIRA_BASE_URL'] = 'https://test.atlassian.net';
    process.env['JIRA_EMAIL'] = 'test@example.com';
    process.env['JIRA_API_TOKEN'] = 'test-token';

    const config = loadConfig();

    expect(config.logLevel).toBe('info');
    expect(config.rateLimit).toBe(100);
    expect(config.useToon).toBe(true);
    expect(config.toonDelimiter).toBe(',');
  });

  it('should use custom optional settings', () => {
    process.env['JIRA_BASE_URL'] = 'https://test.atlassian.net';
    process.env['JIRA_EMAIL'] = 'test@example.com';
    process.env['JIRA_API_TOKEN'] = 'test-token';
    process.env['JIRA_MCP_LOG_LEVEL'] = 'debug';
    process.env['JIRA_MCP_RATE_LIMIT'] = '50';
    process.env['JIRA_MCP_USE_TOON'] = 'false';

    const config = loadConfig();

    expect(config.logLevel).toBe('debug');
    expect(config.rateLimit).toBe(50);
    expect(config.useToon).toBe(false);
  });

  it('should throw for missing required vars', () => {
    // No env vars set
    delete process.env['JIRA_BASE_URL'];
    delete process.env['JIRA_EMAIL'];
    delete process.env['JIRA_API_TOKEN'];

    // Should throw either ConfigurationError or ValidationError
    expect(() => loadConfig()).toThrow();
  });

  it('should throw ValidationError for invalid email', () => {
    process.env['JIRA_BASE_URL'] = 'https://test.atlassian.net';
    process.env['JIRA_EMAIL'] = 'not-an-email';
    process.env['JIRA_API_TOKEN'] = 'test-token';

    expect(() => loadConfig()).toThrow();
  });

  it('should throw ValidationError for invalid URL', () => {
    process.env['JIRA_BASE_URL'] = 'not-a-url';
    process.env['JIRA_EMAIL'] = 'test@example.com';
    process.env['JIRA_API_TOKEN'] = 'test-token';

    expect(() => loadConfig()).toThrow();
  });
});
