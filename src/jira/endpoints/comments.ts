/**
 * Jira Comments API endpoints.
 * @module jira/endpoints/comments
 */

import { getClient } from '../client.js';
import type { JiraComment } from '../types.js';
import { createLogger } from '../../utils/logger.js';
import type { PaginatedResponse } from '../../types/index.js';

const logger = createLogger('jira-comments');

/**
 * Gets comments for an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param startAt - Starting index for pagination
 * @param maxResults - Maximum results to return
 * @returns Paginated list of comments
 *
 * @example
 * const comments = await getComments('PROJ-123');
 */
export async function getComments(
  issueIdOrKey: string,
  startAt: number = 0,
  maxResults: number = 50
): Promise<PaginatedResponse<JiraComment>> {
  logger.debug('Getting comments', { issueIdOrKey });

  const response = await getClient().get<{
    startAt: number;
    maxResults: number;
    total: number;
    comments: JiraComment[];
  }>(`/rest/api/3/issue/${issueIdOrKey}/comment`, {
    params: {
      startAt,
      maxResults,
      orderBy: '-created',
    },
  });

  return {
    startAt: response.startAt,
    maxResults: response.maxResults,
    total: response.total,
    values: response.comments,
    isLast: response.startAt + response.comments.length >= response.total,
  };
}

/**
 * Adds a comment to an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param body - Comment body text
 * @param visibility - Optional visibility restriction
 * @returns The created comment
 *
 * @example
 * const comment = await addComment('PROJ-123', 'This is a comment');
 */
export async function addComment(
  issueIdOrKey: string,
  body: string,
  visibility?: { type: 'group' | 'role'; value: string }
): Promise<JiraComment> {
  logger.debug('Adding comment', { issueIdOrKey });

  const requestBody: Record<string, unknown> = {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: body }],
        },
      ],
    },
  };

  if (visibility) {
    requestBody['visibility'] = visibility;
  }

  return getClient().post<JiraComment>(
    `/rest/api/3/issue/${issueIdOrKey}/comment`,
    { body: requestBody }
  );
}

/**
 * Updates a comment.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param commentId - The comment ID
 * @param body - New comment body text
 * @returns The updated comment
 */
export async function updateComment(
  issueIdOrKey: string,
  commentId: string,
  body: string
): Promise<JiraComment> {
  logger.debug('Updating comment', { issueIdOrKey, commentId });

  return getClient().put<JiraComment>(
    `/rest/api/3/issue/${issueIdOrKey}/comment/${commentId}`,
    {
      body: {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: body }],
            },
          ],
        },
      },
    }
  );
}

/**
 * Deletes a comment.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param commentId - The comment ID
 */
export async function deleteComment(
  issueIdOrKey: string,
  commentId: string
): Promise<void> {
  logger.debug('Deleting comment', { issueIdOrKey, commentId });

  await getClient().delete(
    `/rest/api/3/issue/${issueIdOrKey}/comment/${commentId}`
  );
}

/**
 * Gets a specific comment.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param commentId - The comment ID
 * @returns The comment
 */
export async function getComment(
  issueIdOrKey: string,
  commentId: string
): Promise<JiraComment> {
  logger.debug('Getting comment', { issueIdOrKey, commentId });

  return getClient().get<JiraComment>(
    `/rest/api/3/issue/${issueIdOrKey}/comment/${commentId}`
  );
}
