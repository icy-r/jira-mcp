/**
 * Tests for pagination utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePaginationParams,
  hasMorePages,
  getNextPageParams,
  createPaginatedResponse,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../../../src/utils/pagination.js';

describe('normalizePaginationParams', () => {
  it('should use defaults when no params provided', () => {
    const result = normalizePaginationParams();

    expect(result.startAt).toBe(0);
    expect(result.maxResults).toBe(DEFAULT_PAGE_SIZE);
  });

  it('should use provided values', () => {
    const result = normalizePaginationParams({ startAt: 10, maxResults: 25 });

    expect(result.startAt).toBe(10);
    expect(result.maxResults).toBe(25);
  });

  it('should cap maxResults at MAX_PAGE_SIZE', () => {
    const result = normalizePaginationParams({ maxResults: 500 });

    expect(result.maxResults).toBe(MAX_PAGE_SIZE);
  });
});

describe('hasMorePages', () => {
  it('should return true when there are more items', () => {
    const response = {
      startAt: 0,
      maxResults: 50,
      total: 100,
      values: Array(50).fill({}),
    };

    expect(hasMorePages(response)).toBe(true);
  });

  it('should return false when on last page', () => {
    const response = {
      startAt: 50,
      maxResults: 50,
      total: 100,
      values: Array(50).fill({}),
    };

    expect(hasMorePages(response)).toBe(false);
  });

  it('should respect isLast flag', () => {
    const response = {
      startAt: 0,
      maxResults: 50,
      total: 100,
      values: Array(50).fill({}),
      isLast: true,
    };

    expect(hasMorePages(response)).toBe(false);
  });
});

describe('getNextPageParams', () => {
  it('should return next page params', () => {
    const response = {
      startAt: 0,
      maxResults: 50,
      total: 100,
      values: Array(50).fill({}),
    };

    const next = getNextPageParams(response);

    expect(next).toEqual({ startAt: 50, maxResults: 50 });
  });

  it('should return null when no more pages', () => {
    const response = {
      startAt: 50,
      maxResults: 50,
      total: 100,
      values: Array(50).fill({}),
    };

    expect(getNextPageParams(response)).toBeNull();
  });
});

describe('createPaginatedResponse', () => {
  it('should create response from array', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const response = createPaginatedResponse(items, {
      startAt: 0,
      maxResults: 5,
    });

    expect(response.startAt).toBe(0);
    expect(response.maxResults).toBe(5);
    expect(response.total).toBe(10);
    expect(response.values).toEqual([1, 2, 3, 4, 5]);
    expect(response.isLast).toBe(false);
  });

  it('should handle last page', () => {
    const items = [1, 2, 3, 4, 5];
    const response = createPaginatedResponse(items, {
      startAt: 3,
      maxResults: 5,
    });

    expect(response.values).toEqual([4, 5]);
    expect(response.isLast).toBe(true);
  });

  it('should handle empty array', () => {
    const response = createPaginatedResponse([], {
      startAt: 0,
      maxResults: 50,
    });

    expect(response.total).toBe(0);
    expect(response.values).toEqual([]);
    expect(response.isLast).toBe(true);
  });
});
