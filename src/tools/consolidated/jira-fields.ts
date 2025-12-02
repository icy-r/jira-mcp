/**
 * Consolidated Jira Fields Tool.
 * Provides field discovery and custom field management.
 * @module tools/consolidated/jira-fields
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getAllFields,
  getCustomFields,
  searchFields,
  getFieldId,
  getCommonCustomFieldIds,
  getFieldSuggestions,
  clearFieldsCache,
} from '../../jira/endpoints/fields.js';
import { encodeToon } from '../../formatters/toon.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('tool-jira-fields');

/**
 * Schema for the jira_fields tool.
 */
const jiraFieldsSchema = z.object({
  action: z
    .enum([
      'list',
      'list_custom',
      'search',
      'get_id',
      'get_common',
      'suggest',
      'clear_cache',
    ])
    .describe('The action to perform'),

  // Search options
  query: z
    .string()
    .optional()
    .describe('Search query for search/suggest actions'),

  // Field name
  fieldName: z.string().optional().describe('Field name for get_id action'),

  // Get options
  full: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return full data instead of minimal fields'),

  // Suggestion limit
  limit: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum suggestions for suggest action'),
});

type JiraFieldsInput = z.infer<typeof jiraFieldsSchema>;

/**
 * Handler for the jira_fields tool.
 */
async function handleJiraFields(input: JiraFieldsInput): Promise<string> {
  const { action } = input;

  switch (action) {
    case 'list': {
      const fields = await getAllFields();

      if (input.full) {
        return JSON.stringify(fields, null, 2);
      }

      const simplified = fields.map((f) => ({
        id: f.id,
        name: f.name,
        custom: f.custom,
        searchable: f.searchable,
      }));

      return encodeToon({
        fields: simplified,
        count: fields.length,
      });
    }

    case 'list_custom': {
      const fields = await getCustomFields();

      if (input.full) {
        return JSON.stringify(fields, null, 2);
      }

      const simplified = fields.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.schema?.custom,
      }));

      return encodeToon({
        customFields: simplified,
        count: fields.length,
      });
    }

    case 'search': {
      if (!input.query) {
        throw new Error('query is required for search action');
      }

      const fields = await searchFields(input.query);

      if (input.full) {
        return JSON.stringify(fields, null, 2);
      }

      const simplified = fields.map((f) => ({
        id: f.id,
        name: f.name,
        custom: f.custom,
        clauseNames: f.clauseNames,
      }));

      return encodeToon({
        fields: simplified,
        count: fields.length,
      });
    }

    case 'get_id': {
      if (!input.fieldName) {
        throw new Error('fieldName is required for get_id action');
      }

      const fieldId = await getFieldId(input.fieldName);

      if (!fieldId) {
        return encodeToon({
          found: false,
          message: `Field "${input.fieldName}" not found`,
        });
      }

      return encodeToon({
        found: true,
        fieldName: input.fieldName,
        fieldId,
      });
    }

    case 'get_common': {
      const commonFields = await getCommonCustomFieldIds();

      return encodeToon({
        commonFields,
        note: 'Use these field IDs in customFields parameter',
      });
    }

    case 'suggest': {
      if (!input.query) {
        throw new Error('query is required for suggest action');
      }

      const suggestions = await getFieldSuggestions(
        input.query,
        input.limit ?? 10
      );

      return encodeToon({
        suggestions,
        count: suggestions.length,
      });
    }

    case 'clear_cache': {
      clearFieldsCache();
      return encodeToon({
        success: true,
        message: 'Fields cache cleared',
      });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_fields tool with the MCP server.
 */
export function registerJiraFieldsTool(server: McpServer): void {
  server.tool(
    'jira_fields',
    `Discover and manage Jira fields. Actions:
- list: List all available fields
- list_custom: List only custom fields
- search: Search fields by name
- get_id: Get field ID by name (useful for custom fields)
- get_common: Get IDs of common custom fields (Story Points, Sprint, etc.)
- suggest: Get field name suggestions for autocomplete
- clear_cache: Clear the fields cache`,
    jiraFieldsSchema.shape,
    async (params) => {
      try {
        const input = jiraFieldsSchema.parse(params);
        const result = await handleJiraFields(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_fields error',
          err instanceof Error ? err : new Error(String(err))
        );
        const message = err instanceof Error ? err.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
