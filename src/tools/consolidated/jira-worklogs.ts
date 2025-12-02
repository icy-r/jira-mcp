/**
 * Consolidated Jira Worklogs Tool.
 * Combines all worklog (time tracking) operations into a single action-based tool.
 * @module tools/consolidated/jira-worklogs
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getWorklogs,
  addWorklog,
  updateWorklog,
  deleteWorklog,
} from '../../jira/endpoints/worklogs.js';
import { encodeToon } from '../../formatters/toon.js';
import { adfToPlainText, isAdfDocument } from '../../utils/adf.js';
import { createLogger } from '../../utils/logger.js';
import type { JiraWorklog } from '../../jira/types.js';

const logger = createLogger('tool-jira-worklogs');

/**
 * Schema for the jira_worklogs tool.
 */
const jiraWorklogsSchema = z.object({
  action: z
    .enum(['list', 'add', 'update', 'delete'])
    .describe('The action to perform'),

  // Issue identification
  issueKey: z.string().describe('Issue key (e.g., "PROJ-123")'),

  // Worklog identification
  worklogId: z
    .string()
    .optional()
    .describe('Worklog ID - required for update, delete'),

  // Get options
  full: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return full data instead of minimal fields'),

  // List pagination
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

  // Add/Update fields
  timeSpent: z
    .string()
    .optional()
    .describe('Time spent (e.g., "2h", "1d 4h", "30m") - required for add'),
  started: z
    .string()
    .optional()
    .describe('When work started (ISO datetime) - required for add'),
  comment: z.string().optional().describe('Worklog comment'),
});

type JiraWorklogsInput = z.infer<typeof jiraWorklogsSchema>;

/**
 * Simplifies a worklog for TOON encoding.
 */
function simplifyWorklog(worklog: JiraWorklog): Record<string, unknown> {
  let commentText = '';
  if (worklog.comment) {
    if (typeof worklog.comment === 'string') {
      commentText = worklog.comment;
    } else if (isAdfDocument(worklog.comment)) {
      commentText = adfToPlainText(worklog.comment);
    }
  }

  return {
    id: worklog.id,
    author: worklog.author.displayName,
    timeSpent: worklog.timeSpent,
    started: worklog.started.split('T')[0],
    comment: commentText.substring(0, 100),
  };
}

/**
 * Handler for the jira_worklogs tool.
 */
async function handleJiraWorklogs(input: JiraWorklogsInput): Promise<string> {
  const { action, issueKey } = input;

  switch (action) {
    case 'list': {
      const response = await getWorklogs(
        issueKey,
        input.startAt ?? 0,
        input.maxResults ?? 50
      );

      if (input.full) {
        return JSON.stringify(response, null, 2);
      }

      const simplified = response.values.map(simplifyWorklog);
      return encodeToon({
        worklogs: simplified,
        total: response.total,
        hasMore: !response.isLast,
      });
    }

    case 'add': {
      if (!input.timeSpent || !input.started) {
        throw new Error('timeSpent and started are required for add action');
      }

      const worklog = await addWorklog(
        issueKey,
        input.timeSpent,
        input.started,
        input.comment
      );

      return encodeToon({
        success: true,
        worklog: {
          id: worklog.id,
          timeSpent: worklog.timeSpent,
          started: worklog.started.split('T')[0],
        },
      });
    }

    case 'update': {
      if (!input.worklogId) {
        throw new Error('worklogId is required for update action');
      }

      const worklog = await updateWorklog(issueKey, input.worklogId, {
        timeSpent: input.timeSpent,
        started: input.started,
        comment: input.comment,
      });

      return encodeToon({
        success: true,
        worklog: {
          id: worklog.id,
          timeSpent: worklog.timeSpent,
        },
      });
    }

    case 'delete': {
      if (!input.worklogId) {
        throw new Error('worklogId is required for delete action');
      }

      await deleteWorklog(issueKey, input.worklogId);

      return encodeToon({
        success: true,
        message: `Worklog ${input.worklogId} deleted`,
      });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_worklogs tool with the MCP server.
 */
export function registerJiraWorklogsTool(server: McpServer): void {
  server.tool(
    'jira_worklogs',
    `Manage Jira time tracking / worklogs. Actions:
- list: List worklogs for an issue
- add: Log time spent on an issue
- update: Update a worklog entry
- delete: Remove a worklog entry

Time format examples: "30m", "2h", "1d", "1d 4h 30m"`,
    jiraWorklogsSchema.shape,
    async (params) => {
      try {
        const input = jiraWorklogsSchema.parse(params);
        const result = await handleJiraWorklogs(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_worklogs error',
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
