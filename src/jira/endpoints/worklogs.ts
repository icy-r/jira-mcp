/**
 * Jira Worklogs API endpoints.
 * @module jira/endpoints/worklogs
 */

import { getClient } from '../client.js';
import type { JiraWorklog } from '../types.js';
import { createLogger } from '../../utils/logger.js';
import type { PaginatedResponse } from '../../types/index.js';

const logger = createLogger('jira-worklogs');

/**
 * Gets worklogs for an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param startAt - Starting index for pagination
 * @param maxResults - Maximum results to return
 * @returns Paginated list of worklogs
 *
 * @example
 * const worklogs = await getWorklogs('PROJ-123');
 */
export async function getWorklogs(
  issueIdOrKey: string,
  startAt: number = 0,
  maxResults: number = 50
): Promise<PaginatedResponse<JiraWorklog>> {
  logger.debug('Getting worklogs', { issueIdOrKey });

  const response = await getClient().get<{
    startAt: number;
    maxResults: number;
    total: number;
    worklogs: JiraWorklog[];
  }>(`/rest/api/3/issue/${issueIdOrKey}/worklog`, {
    params: {
      startAt,
      maxResults,
    },
  });

  return {
    startAt: response.startAt,
    maxResults: response.maxResults,
    total: response.total,
    values: response.worklogs,
    isLast: response.startAt + response.worklogs.length >= response.total,
  };
}

/**
 * Adds a worklog to an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param timeSpent - Time spent (e.g., "1h 30m", "2d")
 * @param started - When the work was started (ISO date string)
 * @param comment - Optional comment
 * @returns The created worklog
 *
 * @example
 * const worklog = await addWorklog('PROJ-123', '2h', '2024-01-15T09:00:00.000Z');
 */
export async function addWorklog(
  issueIdOrKey: string,
  timeSpent: string,
  started: string,
  comment?: string
): Promise<JiraWorklog> {
  logger.debug('Adding worklog', { issueIdOrKey, timeSpent });

  const body: Record<string, unknown> = {
    timeSpent,
    started,
  };

  if (comment) {
    body['comment'] = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: comment }],
        },
      ],
    };
  }

  return getClient().post<JiraWorklog>(
    `/rest/api/3/issue/${issueIdOrKey}/worklog`,
    { body }
  );
}

/**
 * Updates a worklog.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param worklogId - The worklog ID
 * @param updates - Fields to update
 * @returns The updated worklog
 */
export async function updateWorklog(
  issueIdOrKey: string,
  worklogId: string,
  updates: {
    timeSpent?: string;
    started?: string;
    comment?: string;
  }
): Promise<JiraWorklog> {
  logger.debug('Updating worklog', { issueIdOrKey, worklogId });

  const body: Record<string, unknown> = {};

  if (updates.timeSpent) {
    body['timeSpent'] = updates.timeSpent;
  }

  if (updates.started) {
    body['started'] = updates.started;
  }

  if (updates.comment) {
    body['comment'] = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: updates.comment }],
        },
      ],
    };
  }

  return getClient().put<JiraWorklog>(
    `/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`,
    { body }
  );
}

/**
 * Deletes a worklog.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param worklogId - The worklog ID
 */
export async function deleteWorklog(
  issueIdOrKey: string,
  worklogId: string
): Promise<void> {
  logger.debug('Deleting worklog', { issueIdOrKey, worklogId });

  await getClient().delete(
    `/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`
  );
}
