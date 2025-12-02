/**
 * Tests for response formatter.
 */

import { describe, it, expect } from 'vitest';
import {
  createSuccessResult,
  createErrorResult,
  createTextResult,
  createListResult,
  createPaginatedResult,
  createActionResult,
} from '../../../src/formatters/response.js';

describe('createSuccessResult', () => {
  it('should create result with formatted content', () => {
    const data = { key: 'value' };
    const result = createSuccessResult(data);

    expect(result.content).toBeDefined();
    expect(result.rawData).toEqual(data);
    expect(result.isError).toBeUndefined();
  });

  it('should respect useToon option', () => {
    const data = { key: 'value' };
    const toonResult = createSuccessResult(data, { useToon: true });
    const jsonResult = createSuccessResult(data, { useToon: false });

    expect(toonResult.content).not.toBe(jsonResult.content);
  });
});

describe('createErrorResult', () => {
  it('should create error result', () => {
    const result = createErrorResult('Something went wrong');

    expect(result.content).toBe('Error: Something went wrong');
    expect(result.isError).toBe(true);
  });

  it('should include details', () => {
    const result = createErrorResult('Failed', { code: 500 });

    expect(result.content).toContain('Failed');
    expect(result.content).toContain('500');
  });
});

describe('createTextResult', () => {
  it('should create simple text result', () => {
    const result = createTextResult('Hello, world!');

    expect(result.content).toBe('Hello, world!');
    expect(result.isError).toBeUndefined();
  });
});

describe('createListResult', () => {
  it('should create list result with count', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = createListResult(items, 'items');

    expect(result.content).toBeDefined();
    expect(result.rawData).toEqual({ items, count: 3 });
  });

  it('should handle empty list', () => {
    const result = createListResult([], 'items');

    expect(result.content).toBe('No items found.');
  });
});

describe('createPaginatedResult', () => {
  it('should create paginated result', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = createPaginatedResult(items, 10, 0, 'items');

    expect(result.rawData).toEqual({
      items,
      pagination: {
        showing: 2,
        total: 10,
        startAt: 0,
        hasMore: true,
      },
    });
  });

  it('should indicate no more pages', () => {
    const items = [{ id: 1 }];
    const result = createPaginatedResult(items, 1, 0, 'items');

    expect(
      (result.rawData as { pagination: { hasMore: boolean } }).pagination
        .hasMore
    ).toBe(false);
  });

  it('should handle empty results', () => {
    const result = createPaginatedResult([], 0, 0, 'items');

    expect(result.content).toBe('No items found.');
  });
});

describe('createActionResult', () => {
  it('should create action confirmation', () => {
    const result = createActionResult('created', 'PROJ-123');

    expect(result.content).toBe('Successfully created: PROJ-123');
  });

  it('should include details', () => {
    const result = createActionResult('updated', 'PROJ-123', {
      status: 'Done',
    });

    expect(result.content).toContain('updated');
    expect(result.content).toContain('PROJ-123');
    expect(result.content).toContain('Done');
  });
});
