/**
 * Consolidated Jira Sprints Tool.
 * Combines all sprint-related operations into a single action-based tool.
 * @module tools/consolidated/jira-sprints
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  listSprints,
  getSprint,
  getSprintIssues,
  getActiveSprint,
  createSprint,
  updateSprint,
  moveIssuesToSprint,
} from '../../jira/endpoints/sprints.js';
import { resolveBoardId } from '../../utils/board-resolver.js';
import {
  encodeToon,
  simplifySprint,
  simplifyIssues,
} from '../../formatters/toon.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('tool-jira-sprints');

/**
 * Schema for the jira_sprints tool.
 */
const jiraSprintsSchema = z.object({
  action: z
    .enum([
      'list',
      'get',
      'get_issues',
      'get_active',
      'create',
      'update',
      'move_issues',
    ])
    .describe('The action to perform'),

  // Board/Sprint identification
  boardId: z
    .number()
    .optional()
    .describe('Board ID (auto-detected from projectKey if not provided)'),
  projectKey: z
    .string()
    .optional()
    .describe('Project key for auto-detecting board'),
  sprintId: z
    .number()
    .optional()
    .describe('Sprint ID - required for get, get_issues, update, move_issues'),

  // Get options
  full: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return full data instead of minimal fields (default: false)'),

  // List filters
  state: z
    .enum(['future', 'active', 'closed'])
    .optional()
    .describe('Filter sprints by state'),
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
  jql: z.string().optional().describe('Additional JQL filter for get_issues'),

  // Create/Update fields
  name: z.string().optional().describe('Sprint name for create/update'),
  startDate: z.string().optional().describe('Sprint start date (ISO format)'),
  endDate: z.string().optional().describe('Sprint end date (ISO format)'),
  goal: z.string().optional().describe('Sprint goal'),

  // Move issues
  issueKeys: z
    .array(z.string())
    .optional()
    .describe('Issue keys to move to sprint'),
});

type JiraSprintsInput = z.infer<typeof jiraSprintsSchema>;

/**
 * Handler for the jira_sprints tool.
 */
async function handleJiraSprints(input: JiraSprintsInput): Promise<string> {
  const { action } = input;

  switch (action) {
    case 'list': {
      const boardId = await resolveBoardId(input.boardId, input.projectKey);
      const response = await listSprints(
        boardId,
        input.state,
        input.startAt ?? 0,
        input.maxResults ?? 50
      );

      if (input.full) {
        return JSON.stringify(response, null, 2);
      }

      const simplified = response.values.map(simplifySprint);
      return encodeToon({
        sprints: simplified,
        total: response.total,
        hasMore: !response.isLast,
      });
    }

    case 'get': {
      if (!input.sprintId) {
        throw new Error('sprintId is required for get action');
      }

      const sprint = await getSprint(input.sprintId);

      if (input.full) {
        return JSON.stringify(sprint, null, 2);
      }

      return encodeToon(simplifySprint(sprint));
    }

    case 'get_issues': {
      if (!input.sprintId) {
        throw new Error('sprintId is required for get_issues action');
      }

      const response = await getSprintIssues(
        input.sprintId,
        input.startAt ?? 0,
        input.maxResults ?? 50,
        input.jql
      );

      if (input.full) {
        return JSON.stringify(response, null, 2);
      }

      return encodeToon({
        issues: simplifyIssues(response.values),
        total: response.total,
        hasMore: !response.isLast,
      });
    }

    case 'get_active': {
      const boardId = await resolveBoardId(input.boardId, input.projectKey);
      const sprint = await getActiveSprint(boardId);

      if (!sprint) {
        return encodeToon({ message: 'No active sprint found' });
      }

      if (input.full) {
        return JSON.stringify(sprint, null, 2);
      }

      return encodeToon(simplifySprint(sprint));
    }

    case 'create': {
      const boardId = await resolveBoardId(input.boardId, input.projectKey);

      if (!input.name) {
        throw new Error('name is required for create action');
      }

      const sprint = await createSprint(
        boardId,
        input.name,
        input.startDate,
        input.endDate,
        input.goal
      );

      return encodeToon({
        success: true,
        sprint: simplifySprint(sprint),
      });
    }

    case 'update': {
      if (!input.sprintId) {
        throw new Error('sprintId is required for update action');
      }

      const sprint = await updateSprint(input.sprintId, {
        name: input.name,
        state: input.state,
        startDate: input.startDate,
        endDate: input.endDate,
        goal: input.goal,
      });

      return encodeToon({
        success: true,
        sprint: simplifySprint(sprint),
      });
    }

    case 'move_issues': {
      if (!input.sprintId) {
        throw new Error('sprintId is required for move_issues action');
      }
      if (!input.issueKeys?.length) {
        throw new Error('issueKeys array is required for move_issues action');
      }

      await moveIssuesToSprint(input.sprintId, input.issueKeys);

      return encodeToon({
        success: true,
        message: `Moved ${input.issueKeys.length} issues to sprint ${input.sprintId}`,
        issueKeys: input.issueKeys,
      });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_sprints tool with the MCP server.
 */
export function registerJiraSprintsTool(server: McpServer): void {
  server.tool(
    'jira_sprints',
    `Manage Jira sprints. Actions:
- list: List sprints for a board (filter by state: future, active, closed)
- get: Get sprint details
- get_issues: Get issues in a sprint
- get_active: Get the currently active sprint
- create: Create a new sprint
- update: Update sprint details (name, dates, goal, state)
- move_issues: Move issues to a sprint

Note: boardId is auto-detected from projectKey if not provided.`,
    jiraSprintsSchema.shape,
    async (params) => {
      try {
        const input = jiraSprintsSchema.parse(params);
        const result = await handleJiraSprints(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_sprints error',
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
