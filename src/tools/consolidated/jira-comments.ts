/**
 * Consolidated Jira Comments Tool.
 * Combines all comment-related operations into a single action-based tool.
 * @module tools/consolidated/jira-comments
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getComment,
} from '../../jira/endpoints/comments.js';
import { encodeToon, simplifyComment } from '../../formatters/toon.js';
import { adfToPlainText, isAdfDocument } from '../../utils/adf.js';
import { createLogger } from '../../utils/logger.js';
import {
  logAudit,
  isDryRunMode,
  validateConfirmation,
  createDryRunSummary,
} from '../../utils/audit.js';
import type { JiraComment } from '../../jira/types.js';

const logger = createLogger('tool-jira-comments');

/**
 * Schema for the jira_comments tool.
 */
const jiraCommentsSchema = z.object({
  action: z
    .enum(['list', 'get', 'add', 'update', 'delete'])
    .describe('The action to perform'),

  // Issue identification
  issueKey: z.string().describe('Issue key (e.g., "PROJ-123")'),

  // Comment identification
  commentId: z
    .string()
    .optional()
    .describe('Comment ID - required for get, update, delete'),

  // Get options
  full: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return full data instead of minimal fields (default: false)'),

  // Safety options
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe('Preview changes without executing (default: false)'),
  confirm: z
    .boolean()
    .optional()
    .default(false)
    .describe('Confirm destructive action (required for update/delete)'),

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
  body: z
    .string()
    .optional()
    .describe('Comment body (supports markdown) - required for add/update'),

  // Visibility restriction
  visibility: z
    .object({
      type: z.enum(['group', 'role']),
      value: z.string(),
    })
    .optional()
    .describe('Visibility restriction for add'),
});

type JiraCommentsInput = z.infer<typeof jiraCommentsSchema>;

/**
 * Formats a single comment.
 */
function formatComment(
  comment: JiraComment,
  full: boolean
): Record<string, unknown> {
  if (full) {
    return {
      ...comment,
      body: isAdfDocument(comment.body)
        ? adfToPlainText(comment.body)
        : comment.body,
    };
  }

  return simplifyComment(comment);
}

/**
 * Handler for the jira_comments tool.
 */
async function handleJiraComments(input: JiraCommentsInput): Promise<string> {
  const { action, issueKey } = input;
  const isDryRun = input.dryRun || isDryRunMode();

  switch (action) {
    case 'list': {
      const response = await getComments(
        issueKey,
        input.startAt ?? 0,
        input.maxResults ?? 50
      );

      if (input.full) {
        const formatted = response.values.map((c) => formatComment(c, true));
        return JSON.stringify(
          { comments: formatted, total: response.total },
          null,
          2
        );
      }

      const simplified = response.values.map((c) => simplifyComment(c));
      return encodeToon({
        comments: simplified,
        total: response.total,
        hasMore: !response.isLast,
      });
    }

    case 'get': {
      if (!input.commentId) {
        throw new Error('commentId is required for get action');
      }

      const comment = await getComment(issueKey, input.commentId);

      if (input.full) {
        return JSON.stringify(formatComment(comment, true), null, 2);
      }

      return encodeToon(simplifyComment(comment));
    }

    case 'add': {
      if (!input.body) {
        throw new Error('body is required for add action');
      }

      const addInput = {
        issueKey,
        body: input.body,
        visibility: input.visibility,
      };

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'create',
          resource: 'comment',
          resourceId: issueKey,
          input: addInput,
          result: 'dry-run',
        });
        return createDryRunSummary('create', 'comment', issueKey, addInput);
      }

      try {
        const comment = await addComment(
          issueKey,
          input.body,
          input.visibility
        );
        logAudit({
          action: 'create',
          resource: 'comment',
          resourceId: `${issueKey}/${comment.id}`,
          input: addInput,
          result: 'success',
        });

        return encodeToon({
          success: true,
          comment: {
            id: comment.id,
            author: comment.author.displayName,
            created: comment.created.split('T')[0],
          },
        });
      } catch (err) {
        logAudit({
          action: 'create',
          resource: 'comment',
          resourceId: issueKey,
          input: addInput,
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    case 'update': {
      if (!input.commentId) {
        throw new Error('commentId is required for update action');
      }
      if (!input.body) {
        throw new Error('body is required for update action');
      }

      // Check confirmation
      if (!isDryRun) {
        const confirmation = validateConfirmation('update', input.confirm);
        if (!confirmation.valid) {
          return encodeToon({
            error: 'Confirmation required',
            message: confirmation.message,
            hint: 'Set confirm: true to proceed, or use dryRun: true to preview.',
          });
        }
      }

      const updateInput = {
        issueKey,
        commentId: input.commentId,
        body: input.body,
      };

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'update',
          resource: 'comment',
          resourceId: `${issueKey}/${input.commentId}`,
          input: updateInput,
          result: 'dry-run',
        });
        return createDryRunSummary(
          'update',
          'comment',
          `${issueKey}/${input.commentId}`,
          updateInput
        );
      }

      try {
        const comment = await updateComment(
          issueKey,
          input.commentId,
          input.body
        );
        logAudit({
          action: 'update',
          resource: 'comment',
          resourceId: `${issueKey}/${input.commentId}`,
          input: updateInput,
          result: 'success',
        });

        return encodeToon({
          success: true,
          comment: {
            id: comment.id,
            updated: comment.updated.split('T')[0],
          },
        });
      } catch (err) {
        logAudit({
          action: 'update',
          resource: 'comment',
          resourceId: `${issueKey}/${input.commentId}`,
          input: updateInput,
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    case 'delete': {
      if (!input.commentId) {
        throw new Error('commentId is required for delete action');
      }

      // Check confirmation
      if (!isDryRun) {
        const confirmation = validateConfirmation('delete', input.confirm);
        if (!confirmation.valid) {
          return encodeToon({
            error: 'Confirmation required',
            message: confirmation.message,
            hint: 'Set confirm: true to proceed, or use dryRun: true to preview.',
          });
        }
      }

      const deleteInput = {
        issueKey,
        commentId: input.commentId,
      };

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'delete',
          resource: 'comment',
          resourceId: `${issueKey}/${input.commentId}`,
          input: deleteInput,
          result: 'dry-run',
        });
        return createDryRunSummary(
          'delete',
          'comment',
          `${issueKey}/${input.commentId}`,
          deleteInput
        );
      }

      try {
        await deleteComment(issueKey, input.commentId);
        logAudit({
          action: 'delete',
          resource: 'comment',
          resourceId: `${issueKey}/${input.commentId}`,
          input: deleteInput,
          result: 'success',
        });

        return encodeToon({
          success: true,
          message: `Comment ${input.commentId} deleted`,
        });
      } catch (err) {
        logAudit({
          action: 'delete',
          resource: 'comment',
          resourceId: `${issueKey}/${input.commentId}`,
          input: deleteInput,
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_comments tool with the MCP server.
 */
export function registerJiraCommentsTool(server: McpServer): void {
  server.tool(
    'jira_comments',
    `Manage Jira issue comments. Actions:
- list: List comments on an issue
- get: Get a specific comment
- add: Add a new comment (supports markdown)
- update: Update comment body (requires confirm=true or dryRun=true)
- delete: Delete a comment (requires confirm=true or dryRun=true)

Safety: Use dryRun=true to preview changes.`,
    jiraCommentsSchema.shape,
    async (params) => {
      try {
        const input = jiraCommentsSchema.parse(params);
        const result = await handleJiraComments(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_comments error',
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
