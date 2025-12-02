/**
 * MCP-specific type definitions.
 * @module types/mcp
 */

import type { z } from 'zod';

/**
 * Tool execution result with optional TOON formatting.
 */
export interface ToolResult {
  /** Text content of the result */
  content: string;
  /** Whether the result is an error */
  isError?: boolean;
  /** Original data before formatting */
  rawData?: unknown;
}

/**
 * Tool handler function type.
 */
export type ToolHandler<T extends z.ZodTypeAny> = (
  args: z.infer<T>
) => Promise<ToolResult>;

/**
 * Resource handler function type.
 */
export type ResourceHandler = (
  uri: URL,
  params: Record<string, string>
) => Promise<ResourceResult>;

/**
 * Resource result type.
 */
export interface ResourceResult {
  /** Resource contents */
  contents: Array<{
    /** Resource URI */
    uri: string;
    /** MIME type */
    mimeType?: string;
    /** Text content */
    text: string;
  }>;
}

/**
 * Tool definition for registration.
 */
export interface ToolDefinition<T extends z.ZodTypeAny> {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input schema using Zod */
  inputSchema: T;
  /** Tool handler function */
  handler: ToolHandler<T>;
}

/**
 * Format options for tool responses.
 */
export interface FormatOptions {
  /** Whether to use TOON format */
  useToon: boolean;
  /** Key folding mode for TOON */
  keyFolding?: 'off' | 'safe' | 'aggressive';
  /** Custom delimiter for TOON arrays */
  delimiter?: string;
}
