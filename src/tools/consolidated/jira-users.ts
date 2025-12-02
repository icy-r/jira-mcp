/**
 * Consolidated Jira Users Tool.
 * Combines all user-related operations into a single action-based tool.
 * @module tools/consolidated/jira-users
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getCurrentUser,
  getUser,
  searchUsers,
  getAssignableUsers,
  getProjectAssignableUsers,
} from '../../jira/endpoints/users.js';
import { encodeToon, simplifyUser } from '../../formatters/toon.js';
import { createLogger } from '../../utils/logger.js';
import type { JiraUser } from '../../jira/types.js';

const logger = createLogger('tool-jira-users');

/**
 * Schema for the jira_users tool.
 */
const jiraUsersSchema = z.object({
  action: z
    .enum(['get_current', 'get', 'search', 'get_assignable'])
    .describe('The action to perform'),

  // User identification
  accountId: z
    .string()
    .optional()
    .describe('User account ID - required for get action'),

  // Search options
  query: z
    .string()
    .optional()
    .describe('Search query (name, email) for search/get_assignable'),

  // Assignable context
  issueKey: z
    .string()
    .optional()
    .describe(
      'Issue key for get_assignable (users who can be assigned to this issue)'
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      'Project key for get_assignable (users who can be assigned in this project)'
    ),

  // Get options
  full: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return full data instead of minimal fields'),

  // Pagination
  maxResults: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum results (default: 50)'),
});

type JiraUsersInput = z.infer<typeof jiraUsersSchema>;

/**
 * Handler for the jira_users tool.
 */
async function handleJiraUsers(input: JiraUsersInput): Promise<string> {
  const { action } = input;

  switch (action) {
    case 'get_current': {
      const user = await getCurrentUser();

      if (input.full) {
        return JSON.stringify(user, null, 2);
      }

      return encodeToon(simplifyUser(user));
    }

    case 'get': {
      if (!input.accountId) {
        throw new Error('accountId is required for get action');
      }

      const user = await getUser(input.accountId);

      if (input.full) {
        return JSON.stringify(user, null, 2);
      }

      return encodeToon(simplifyUser(user));
    }

    case 'search': {
      if (!input.query) {
        throw new Error('query is required for search action');
      }

      const users = await searchUsers(input.query, input.maxResults ?? 50);

      if (input.full) {
        return JSON.stringify(users, null, 2);
      }

      return encodeToon({
        users: users.map(simplifyUser),
        count: users.length,
      });
    }

    case 'get_assignable': {
      let users: JiraUser[];

      if (input.issueKey) {
        users = await getAssignableUsers(
          input.issueKey,
          input.query,
          input.maxResults ?? 50
        );
      } else if (input.projectKey) {
        users = await getProjectAssignableUsers(
          input.projectKey,
          input.query,
          input.maxResults ?? 50
        );
      } else {
        throw new Error(
          'Either issueKey or projectKey is required for get_assignable action'
        );
      }

      if (input.full) {
        return JSON.stringify(users, null, 2);
      }

      return encodeToon({
        assignableUsers: users.map(simplifyUser),
        count: users.length,
      });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_users tool with the MCP server.
 */
export function registerJiraUsersTool(server: McpServer): void {
  server.tool(
    'jira_users',
    `Manage Jira users. Actions:
- get_current: Get the currently authenticated user
- get: Get a user by account ID
- search: Search users by name or email
- get_assignable: Get users who can be assigned to an issue or project`,
    jiraUsersSchema.shape,
    async (params) => {
      try {
        const input = jiraUsersSchema.parse(params);
        const result = await handleJiraUsers(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_users error',
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
