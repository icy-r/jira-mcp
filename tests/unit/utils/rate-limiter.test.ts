/**
 * Tests for rate limiter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RateLimiter,
  createJiraRateLimiter,
} from '../../../src/utils/rate-limiter.js';
import { RateLimitError } from '../../../src/utils/errors.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 1000 });

    // Should not throw for first 10 requests
    for (let i = 0; i < 10; i++) {
      expect(() => limiter.acquire()).not.toThrow();
    }
  });

  it('should throw RateLimitError when limit exceeded', () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

    limiter.acquire();
    limiter.acquire();

    expect(() => limiter.acquire()).toThrow(RateLimitError);
  });

  it('should refill tokens over time', () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

    limiter.acquire();
    limiter.acquire();

    // Advance time by half the window
    vi.advanceTimersByTime(500);

    // Should have 1 token refilled
    expect(() => limiter.acquire()).not.toThrow();
  });

  it('should report remaining tokens', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });

    expect(limiter.getRemainingTokens()).toBe(5);

    limiter.acquire();
    expect(limiter.getRemainingTokens()).toBe(4);

    limiter.acquire();
    limiter.acquire();
    expect(limiter.getRemainingTokens()).toBe(2);
  });

  it('should check if can acquire', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });

    expect(limiter.canAcquire()).toBe(true);

    limiter.acquire();
    expect(limiter.canAcquire()).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(limiter.canAcquire()).toBe(true);
  });

  it('should calculate time until next token', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });

    expect(limiter.getTimeUntilNextToken()).toBe(0);

    limiter.acquire();
    const waitTime = limiter.getTimeUntilNextToken();
    expect(waitTime).toBeGreaterThan(0);
    expect(waitTime).toBeLessThanOrEqual(1000);
  });

  it('should wait for token', async () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });

    limiter.acquire();

    const waitPromise = limiter.waitForToken();

    // Advance time
    vi.advanceTimersByTime(1000);

    await waitPromise;

    // Should have acquired the token
    expect(limiter.getRemainingTokens()).toBe(0);
  });
});

describe('createJiraRateLimiter', () => {
  it('should create limiter with default rate', () => {
    const limiter = createJiraRateLimiter();

    expect(limiter.getRemainingTokens()).toBe(100);
  });

  it('should create limiter with custom rate', () => {
    const limiter = createJiraRateLimiter(50);

    expect(limiter.getRemainingTokens()).toBe(50);
  });
});
