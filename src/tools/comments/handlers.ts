/**
 * Comment tool handlers.
 * @module tools/comments/handlers
 */

import type { z } from 'zod';
import * as comments from '../../jira/endpoints/comments.js';
import { simplifyComment } from '../../formatters/toon.js';
import {
  createSuccessResult,
  createPaginatedResult,
  createActionResult,
} from '../../formatters/response.js';
import { formatErrorForMcp } from '../../utils/errors.js';
import { createLogger } from '../../utils/logger.js';
import type { ToolResult } from '../../types/mcp.js';
import type {
  getCommentsSchema,
  addCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from './schemas.js';

const logger = createLogger('comment-handlers');

/**
 * Handles getting comments.
 */
export async function handleGetComments(
  args: z.infer<typeof getCommentsSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting comments', { issueKey: args.issueKey });

    const result = await comments.getComments(
      args.issueKey,
      0,
      args.maxResults
    );

    const simplified = result.values.map(simplifyComment);

    return createPaginatedResult(
      simplified,
      result.total,
      result.startAt,
      'comments'
    );
  } catch (error) {
    logger.error('Failed to get comments', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles adding a comment.
 */
export async function handleAddComment(
  args: z.infer<typeof addCommentSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Adding comment', { issueKey: args.issueKey });

    const comment = await comments.addComment(
      args.issueKey,
      args.body,
      args.visibility
    );

    const simplified = simplifyComment(comment);

    return createSuccessResult({
      message: `Comment added to ${args.issueKey}`,
      comment: simplified,
    });
  } catch (error) {
    logger.error('Failed to add comment', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles updating a comment.
 */
export async function handleUpdateComment(
  args: z.infer<typeof updateCommentSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Updating comment', {
      issueKey: args.issueKey,
      commentId: args.commentId,
    });

    const comment = await comments.updateComment(
      args.issueKey,
      args.commentId,
      args.body
    );

    const simplified = simplifyComment(comment);

    return createSuccessResult({
      message: 'Comment updated successfully',
      comment: simplified,
    });
  } catch (error) {
    logger.error('Failed to update comment', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles deleting a comment.
 */
export async function handleDeleteComment(
  args: z.infer<typeof deleteCommentSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Deleting comment', {
      issueKey: args.issueKey,
      commentId: args.commentId,
    });

    await comments.deleteComment(args.issueKey, args.commentId);

    return createActionResult(
      'deleted comment',
      `${args.issueKey}#${args.commentId}`
    );
  } catch (error) {
    logger.error('Failed to delete comment', error as Error);
    return formatErrorForMcp(error);
  }
}
