/**
 * Jira Worklogs API endpoints.
 * @module jira/endpoints/worklogs
 */

import { getClient } from '../client.js';
import type { JiraWorklog } from '../types.js';
import { createLogger } from '../../utils/logger.js';
import type { PaginatedResponse } from '../../types/index.js';
import { markdownToAdf } from '../../utils/adf.js';

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
 * Options for adjusting time estimates when adding a worklog.
 */
export interface WorklogEstimateOptions {
  /** How to adjust the remaining estimate */
  adjustEstimate?: 'new' | 'leave' | 'manual' | 'auto';
  /** New remaining estimate (required if adjustEstimate is 'new') */
  newEstimate?: string;
  /** Amount to reduce remaining estimate by (required if adjustEstimate is 'manual') */
  reduceBy?: string;
}

/**
 * Adds a worklog to an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param timeSpent - Time spent (e.g., "1h 30m", "2d")
 * @param started - When the work was started (ISO date string)
 * @param comment - Optional comment
 * @param estimateOptions - Options for adjusting time estimates
 * @returns The created worklog
 *
 * @example
 * const worklog = await addWorklog('PROJ-123', '2h', '2024-01-15T09:00:00.000Z');
 */
export async function addWorklog(
  issueIdOrKey: string,
  timeSpent: string,
  started: string,
  comment?: string,
  estimateOptions?: WorklogEstimateOptions
): Promise<JiraWorklog> {
  logger.debug('Adding worklog', { issueIdOrKey, timeSpent, estimateOptions });

  const body: Record<string, unknown> = {
    timeSpent,
    started,
  };

  if (comment) {
    // Convert markdown to ADF for proper formatting
    body['comment'] = markdownToAdf(comment);
  }

  // Build query params for estimate adjustment
  const params: Record<string, string | undefined> = {};
  if (estimateOptions?.adjustEstimate) {
    params['adjustEstimate'] = estimateOptions.adjustEstimate;
    if (
      estimateOptions.adjustEstimate === 'new' &&
      estimateOptions.newEstimate
    ) {
      params['newEstimate'] = estimateOptions.newEstimate;
    }
    if (
      estimateOptions.adjustEstimate === 'manual' &&
      estimateOptions.reduceBy
    ) {
      params['reduceBy'] = estimateOptions.reduceBy;
    }
  }

  return getClient().post<JiraWorklog>(
    `/rest/api/3/issue/${issueIdOrKey}/worklog`,
    { body, params }
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
    // Convert markdown to ADF for proper formatting
    body['comment'] = markdownToAdf(updates.comment);
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
