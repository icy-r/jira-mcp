/**
 * Token bucket rate limiter for Jira API requests.
 * Implements a sliding window rate limiting algorithm.
 * @module utils/rate-limiter
 */

import { RateLimitError } from './errors.js';
import { createLogger } from './logger.js';

const logger = createLogger('rate-limiter');

/**
 * Rate limiter configuration.
 */
export interface RateLimiterConfig {
  /** Maximum number of requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Token bucket rate limiter.
 * Tracks requests within a sliding window and prevents exceeding the limit.
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private tokens: number;
  private lastRefill: number;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.tokens = config.maxRequests;
    this.lastRefill = Date.now();
  }

  /**
   * Refills tokens based on elapsed time.
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.windowMs) * this.maxRequests;

    this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Attempts to acquire a token for a request.
   * @throws {RateLimitError} If rate limit is exceeded
   */
  acquire(): void {
    this.refill();

    if (this.tokens < 1) {
      const retryAfter = Math.ceil(
        ((1 - this.tokens) / this.maxRequests) * this.windowMs
      );
      logger.warn('Rate limit exceeded', {
        tokens: this.tokens,
        retryAfter,
      });
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${retryAfter}ms`,
        retryAfter
      );
    }

    this.tokens -= 1;
    logger.debug('Token acquired', { remainingTokens: this.tokens });
  }

  /**
   * Checks if a request can be made without blocking.
   */
  canAcquire(): boolean {
    this.refill();
    return this.tokens >= 1;
  }

  /**
   * Gets the number of remaining tokens.
   */
  getRemainingTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Gets the time until the next token is available.
   */
  getTimeUntilNextToken(): number {
    this.refill();
    if (this.tokens >= 1) {
      return 0;
    }
    return Math.ceil(((1 - this.tokens) / this.maxRequests) * this.windowMs);
  }

  /**
   * Waits until a token is available.
   */
  async waitForToken(): Promise<void> {
    const waitTime = this.getTimeUntilNextToken();
    if (waitTime > 0) {
      logger.debug('Waiting for rate limit', { waitTime });
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.acquire();
  }
}

/**
 * Creates a rate limiter with Jira's default limits.
 * Jira Cloud has a limit of approximately 100 requests per minute.
 */
export function createJiraRateLimiter(
  requestsPerMinute: number = 100
): RateLimiter {
  return new RateLimiter({
    maxRequests: requestsPerMinute,
    windowMs: 60000, // 1 minute
  });
}
