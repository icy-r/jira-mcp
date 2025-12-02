/**
 * Jira API client with authentication and rate limiting.
 * Provides a centralized interface for all Jira API interactions.
 * @module jira/client
 */

import type { JiraConfig } from '../types/index.js';
import { JiraApiError, AuthenticationError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';
import { RateLimiter, createJiraRateLimiter } from '../utils/rate-limiter.js';

const logger = createLogger('jira-client');

/**
 * HTTP methods supported by the client.
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Request options for API calls.
 */
export interface RequestOptions {
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request body */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Whether to skip rate limiting */
  skipRateLimit?: boolean;
}

/**
 * Jira API client class.
 * Handles authentication, rate limiting, and request/response processing.
 */
export class JiraClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly rateLimiter: RateLimiter;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;

  constructor(config: JiraConfig, rateLimit: number = 100) {
    this.baseUrl = config.baseUrl;
    this.authHeader = this.createAuthHeader(config.email, config.apiToken);
    this.rateLimiter = createJiraRateLimiter(rateLimit);

    logger.info('Jira client initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Creates the Basic Auth header from email and API token.
   */
  private createAuthHeader(email: string, apiToken: string): string {
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Builds a URL with query parameters.
   */
  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, this.baseUrl);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Makes an HTTP request to the Jira API.
   */
  private async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, body, headers, skipRateLimit } = options;

    // Apply rate limiting unless skipped
    if (!skipRateLimit) {
      await this.rateLimiter.waitForToken();
    }

    const url = this.buildUrl(path, params);
    const requestHeaders: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    logger.debug('Making API request', {
      method,
      path,
      params,
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });

        // Handle rate limiting response
        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get('Retry-After') || '60',
            10
          );
          logger.warn('Rate limited by Jira API', { retryAfter, attempt });
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000)
          );
          continue;
        }

        // Handle authentication errors
        if (response.status === 401) {
          throw new AuthenticationError(
            'Invalid Jira credentials. Please check your email and API token.'
          );
        }

        // Handle forbidden errors
        if (response.status === 403) {
          throw new JiraApiError(
            'Access forbidden. Check your permissions.',
            403
          );
        }

        // Handle not found errors
        if (response.status === 404) {
          throw await JiraApiError.fromResponse(response, { path });
        }

        // Handle other error responses
        if (!response.ok) {
          throw await JiraApiError.fromResponse(response, { path, method });
        }

        // Handle empty responses
        if (
          response.status === 204 ||
          response.headers.get('Content-Length') === '0'
        ) {
          return {} as T;
        }

        const data = await response.json();
        logger.debug('API request successful', {
          path,
          status: response.status,
        });
        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry authentication or forbidden errors
        if (
          error instanceof AuthenticationError ||
          (error instanceof JiraApiError &&
            (error.statusCode === 403 || error.statusCode === 404))
        ) {
          throw error;
        }

        // Retry on network errors or 5xx errors
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.warn('Request failed, retrying', {
            attempt,
            delay,
            error: (error as Error).message,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('All retry attempts failed', lastError as Error);
    throw lastError;
  }

  /**
   * Makes a GET request.
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  /**
   * Makes a POST request.
   */
  async post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, options);
  }

  /**
   * Makes a PUT request.
   */
  async put<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, options);
  }

  /**
   * Makes a PATCH request.
   */
  async patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, options);
  }

  /**
   * Makes a DELETE request.
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Gets the remaining rate limit tokens.
   */
  getRemainingRateLimit(): number {
    return this.rateLimiter.getRemainingTokens();
  }

  /**
   * Validates the connection to Jira.
   * @throws {AuthenticationError} If credentials are invalid
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.get('/rest/api/3/myself');
      logger.info('Jira connection validated successfully');
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Failed to validate Jira connection', error as Error);
      return false;
    }
  }
}

/**
 * Singleton client instance.
 */
let clientInstance: JiraClient | null = null;

/**
 * Initializes the Jira client singleton.
 */
export function initializeClient(
  config: JiraConfig,
  rateLimit?: number
): JiraClient {
  clientInstance = new JiraClient(config, rateLimit);
  return clientInstance;
}

/**
 * Gets the Jira client singleton.
 * @throws {Error} If client is not initialized
 */
export function getClient(): JiraClient {
  if (!clientInstance) {
    throw new Error(
      'Jira client not initialized. Call initializeClient first.'
    );
  }
  return clientInstance;
}

/**
 * Resets the client singleton (useful for testing).
 */
export function resetClient(): void {
  clientInstance = null;
}
