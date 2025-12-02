/**
 * Configuration validation schemas using Zod.
 * @module config/schema
 */

import { z } from 'zod';

/**
 * Log level schema.
 */
export const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

/**
 * Jira configuration schema.
 */
export const jiraConfigSchema = z.object({
  baseUrl: z
    .string()
    .url('JIRA_BASE_URL must be a valid URL')
    .refine(
      (url) => url.includes('atlassian.net') || url.includes('jira'),
      'JIRA_BASE_URL should be a Jira instance URL'
    ),
  email: z.string().email('JIRA_EMAIL must be a valid email address'),
  apiToken: z.string().min(1, 'JIRA_API_TOKEN is required'),
});

/**
 * Application configuration schema.
 */
export const appConfigSchema = z.object({
  jira: jiraConfigSchema,
  logLevel: logLevelSchema.default('info'),
  rateLimit: z.number().int().positive().default(100),
  useToon: z.boolean().default(true),
  toonDelimiter: z.string().default(','),
});

/**
 * Environment variables schema.
 */
export const envSchema = z.object({
  JIRA_BASE_URL: z.string().url(),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),
  JIRA_MCP_LOG_LEVEL: logLevelSchema.optional(),
  JIRA_MCP_RATE_LIMIT: z.coerce.number().int().positive().optional(),
  JIRA_MCP_USE_TOON: z
    .string()
    .transform((val) => val.toLowerCase() === 'true')
    .optional(),
  JIRA_MCP_TOON_DELIMITER: z.string().optional(),
});

export type JiraConfigInput = z.input<typeof jiraConfigSchema>;
export type AppConfigInput = z.input<typeof appConfigSchema>;
export type EnvInput = z.input<typeof envSchema>;
