/**
 * Consolidated Jira Boards Tool.
 * Combines all board-related operations into a single action-based tool.
 * @module tools/consolidated/jira-boards
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  listBoards,
  getBoard,
  getBoardConfiguration,
  getBoardBacklog,
} from '../../jira/endpoints/boards.js';
import {
  getSprintIssues,
  getActiveSprint,
} from '../../jira/endpoints/sprints.js';
import { encodeToon, simplifyIssues } from '../../formatters/toon.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('tool-jira-boards');

/**
 * Schema for the jira_boards tool.
 */
const jiraBoardsSchema = z.object({
  action: z
    .enum(['list', 'get', 'get_config', 'get_issues', 'get_backlog'])
    .describe('The action to perform'),

  // Board identification
  boardId: z
    .number()
    .optional()
    .describe(
      'Board ID - required for get, get_config, get_issues, get_backlog'
    ),
  projectKey: z.string().optional().describe('Project key to filter boards'),

  // Get options
  full: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return full data instead of minimal fields (default: false)'),

  // List filters
  type: z
    .enum(['scrum', 'kanban', 'simple'])
    .optional()
    .describe('Filter boards by type'),
  maxResults: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum results (default: 50)'),
  startAt: z
    .number()
    .optional()
    .default(0)
    .describe('Starting index for pagination'),

  // Get issues options
  jql: z
    .string()
    .optional()
    .describe('Additional JQL filter for get_issues/get_backlog'),
});

type JiraBoardsInput = z.infer<typeof jiraBoardsSchema>;

/**
 * Handler for the jira_boards tool.
 */
async function handleJiraBoards(input: JiraBoardsInput): Promise<string> {
  const { action } = input;

  switch (action) {
    case 'list': {
      const response = await listBoards(
        input.projectKey,
        input.type,
        input.startAt ?? 0,
        input.maxResults ?? 50
      );

      if (input.full) {
        return JSON.stringify(response, null, 2);
      }

      const simplified = response.values.map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        project: b.location?.projectKey,
      }));

      return encodeToon({
        boards: simplified,
        total: response.total,
        hasMore: !response.isLast,
      });
    }

    case 'get': {
      if (!input.boardId) {
        throw new Error('boardId is required for get action');
      }

      const board = await getBoard(input.boardId);

      if (input.full) {
        return JSON.stringify(board, null, 2);
      }

      return encodeToon({
        id: board.id,
        name: board.name,
        type: board.type,
        project: board.location?.projectKey,
      });
    }

    case 'get_config': {
      if (!input.boardId) {
        throw new Error('boardId is required for get_config action');
      }

      const config = await getBoardConfiguration(input.boardId);

      if (input.full) {
        return JSON.stringify(config, null, 2);
      }

      const simplified = {
        id: config.id,
        name: config.name,
        type: config.type,
        columns: config.columnConfig.columns.map((c) => c.name),
        estimation: config.estimation?.type,
      };

      return encodeToon(simplified);
    }

    case 'get_issues': {
      if (!input.boardId) {
        throw new Error('boardId is required for get_issues action');
      }

      // Get active sprint issues for the board
      const activeSprint = await getActiveSprint(input.boardId);

      if (!activeSprint) {
        return encodeToon({ message: 'No active sprint found for this board' });
      }

      const response = await getSprintIssues(
        activeSprint.id,
        input.startAt ?? 0,
        input.maxResults ?? 50,
        input.jql
      );

      if (input.full) {
        return JSON.stringify(
          {
            sprint: activeSprint,
            issues: response.values,
            total: response.total,
          },
          null,
          2
        );
      }

      return encodeToon({
        sprint: {
          id: activeSprint.id,
          name: activeSprint.name,
        },
        issues: simplifyIssues(response.values),
        total: response.total,
        hasMore: !response.isLast,
      });
    }

    case 'get_backlog': {
      if (!input.boardId) {
        throw new Error('boardId is required for get_backlog action');
      }

      const response = await getBoardBacklog(
        input.boardId,
        input.startAt ?? 0,
        input.maxResults ?? 50,
        input.jql
      );

      if (input.full) {
        return JSON.stringify(response, null, 2);
      }

      return encodeToon({
        backlog: response.values.map((i) => ({ key: i.key })),
        total: response.total,
        hasMore: !response.isLast,
      });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_boards tool with the MCP server.
 */
export function registerJiraBoardsTool(server: McpServer): void {
  server.tool(
    'jira_boards',
    `Manage Jira boards. Actions:
- list: List all boards (filter by projectKey or type: scrum, kanban, simple)
- get: Get board details
- get_config: Get board configuration (columns, estimation)
- get_issues: Get issues in the active sprint
- get_backlog: Get backlog issues`,
    jiraBoardsSchema.shape,
    async (params) => {
      try {
        const input = jiraBoardsSchema.parse(params);
        const result = await handleJiraBoards(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_boards error',
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
