/**
 * Configuration loader for the Jira MCP server.
 * Loads and validates configuration from environment variables.
 * @module config
 */

import { envSchema, appConfigSchema } from './schema.js';
import { ConfigurationError, ValidationError } from '../utils/errors.js';
import type { AppConfig } from '../types/index.js';

/**
 * Loads configuration from environment variables.
 * @throws {ConfigurationError} If required environment variables are missing
 * @throws {ValidationError} If environment variables are invalid
 */
export function loadConfig(): AppConfig {
  const envResult = envSchema.safeParse(process.env);

  if (!envResult.success) {
    const missingVars = envResult.error.issues
      .filter((e) => e.message.includes('Required'))
      .map((e) => e.path.join('.'));

    if (missingVars.length > 0) {
      throw new ConfigurationError(
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
    }

    throw ValidationError.fromZodError(envResult.error);
  }

  const env = envResult.data;

  const configInput = {
    jira: {
      baseUrl: env.JIRA_BASE_URL.replace(/\/$/, ''), // Remove trailing slash
      email: env.JIRA_EMAIL,
      apiToken: env.JIRA_API_TOKEN,
    },
    logLevel: env.JIRA_MCP_LOG_LEVEL ?? 'info',
    rateLimit: env.JIRA_MCP_RATE_LIMIT ?? 100,
    useToon: env.JIRA_MCP_USE_TOON ?? true,
    toonDelimiter: env.JIRA_MCP_TOON_DELIMITER ?? ',',
  };

  const configResult = appConfigSchema.safeParse(configInput);

  if (!configResult.success) {
    throw ValidationError.fromZodError(configResult.error);
  }

  return configResult.data;
}

/**
 * Gets configuration, throwing if not valid.
 */
let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Resets the cached configuration (useful for testing).
 */
export function resetConfig(): void {
  cachedConfig = null;
}

export * from './schema.js';
