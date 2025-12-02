/**
 * Core type definitions for the Jira MCP server.
 * @module types
 */

export * from './mcp.js';

/**
 * Log levels supported by the application.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Application configuration interface.
 */
export interface AppConfig {
  /** Jira instance base URL */
  jira: JiraConfig;
  /** Logging configuration */
  logLevel: LogLevel;
  /** Rate limit for API requests per minute */
  rateLimit: number;
  /** Whether to use TOON format for responses */
  useToon: boolean;
  /** Delimiter for TOON format */
  toonDelimiter: string;
}

/**
 * Jira API configuration.
 */
export interface JiraConfig {
  /** Base URL of the Jira instance (e.g., https://your-domain.atlassian.net) */
  baseUrl: string;
  /** Email address associated with the Atlassian account */
  email: string;
  /** API token for authentication (never logged or exposed) */
  apiToken: string;
}

/**
 * Pagination parameters for Jira API requests.
 */
export interface PaginationParams {
  /** Starting index for pagination */
  startAt?: number;
  /** Maximum number of results to return */
  maxResults?: number;
}

/**
 * Paginated response from Jira API.
 */
export interface PaginatedResponse<T> {
  /** Starting index */
  startAt: number;
  /** Maximum results requested */
  maxResults: number;
  /** Total number of results available */
  total: number;
  /** Array of results */
  values: T[];
  /** Whether this is the last page */
  isLast?: boolean;
}

/**
 * Generic API response wrapper.
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if request failed */
  error?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}
