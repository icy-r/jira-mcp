/**
 * Response formatting utilities for MCP tools.
 * @module formatters/response
 */

import { formatResponse, type ToonOptions } from './toon.js';
import type { ToolResult } from '../types/mcp.js';

/**
 * Format options for tool responses.
 */
export interface FormatOptions {
  /** Whether to use TOON format */
  useToon: boolean;
  /** Key folding mode for TOON */
  keyFolding?: 'off' | 'safe';
  /** Custom delimiter for TOON arrays */
  delimiter?: ',' | '\t';
}

/**
 * Default format options.
 */
const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  useToon: true,
  keyFolding: 'safe',
  delimiter: ',',
};

/**
 * Creates a successful tool result.
 *
 * @param data - Response data
 * @param options - Format options
 * @returns Tool result
 */
export function createSuccessResult(
  data: unknown,
  options?: Partial<FormatOptions>
): ToolResult {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };
  const toonOpts: ToonOptions = {
    keyFolding: opts.keyFolding,
    delimiter: opts.delimiter,
  };
  const content = formatResponse(data, opts.useToon, toonOpts);

  return {
    content,
    rawData: data,
  };
}

/**
 * Creates an error tool result.
 *
 * @param message - Error message
 * @param details - Optional error details
 * @returns Tool result with isError flag
 */
export function createErrorResult(
  message: string,
  details?: Record<string, unknown>
): ToolResult {
  const content = details
    ? `Error: ${message}\nDetails: ${JSON.stringify(details, null, 2)}`
    : `Error: ${message}`;

  return {
    content,
    isError: true,
  };
}

/**
 * Creates a simple text result.
 *
 * @param text - Text content
 * @returns Tool result
 */
export function createTextResult(text: string): ToolResult {
  return {
    content: text,
  };
}

/**
 * Creates a result for a list of items with count.
 *
 * @param items - Array of items
 * @param itemName - Name of items for the message
 * @param options - Format options
 * @returns Tool result
 */
export function createListResult<T>(
  items: T[],
  itemName: string,
  options?: Partial<FormatOptions>
): ToolResult {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };

  if (items.length === 0) {
    return createTextResult(`No ${itemName} found.`);
  }

  const data = { [itemName]: items, count: items.length };
  const toonOpts: ToonOptions = {
    keyFolding: opts.keyFolding,
    delimiter: opts.delimiter,
  };
  const content = formatResponse(data, opts.useToon, toonOpts);

  return {
    content,
    rawData: data,
  };
}

/**
 * Creates a result for paginated data.
 *
 * @param items - Array of items
 * @param total - Total count
 * @param startAt - Starting index
 * @param itemName - Name of items
 * @param options - Format options
 * @returns Tool result
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  startAt: number,
  itemName: string,
  options?: Partial<FormatOptions>
): ToolResult {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };

  if (items.length === 0) {
    return createTextResult(`No ${itemName} found.`);
  }

  const data = {
    [itemName]: items,
    pagination: {
      showing: items.length,
      total,
      startAt,
      hasMore: startAt + items.length < total,
    },
  };

  const toonOpts: ToonOptions = {
    keyFolding: opts.keyFolding,
    delimiter: opts.delimiter,
  };
  const content = formatResponse(data, opts.useToon, toonOpts);

  return {
    content,
    rawData: data,
  };
}

/**
 * Creates a confirmation result for actions.
 *
 * @param action - Action that was performed
 * @param target - Target of the action
 * @param details - Optional additional details
 * @returns Tool result
 */
export function createActionResult(
  action: string,
  target: string,
  details?: Record<string, unknown>
): ToolResult {
  let content = `Successfully ${action}: ${target}`;

  if (details) {
    content += `\n${JSON.stringify(details, null, 2)}`;
  }

  return {
    content,
    rawData: { action, target, ...details },
  };
}
