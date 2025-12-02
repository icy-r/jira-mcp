/**
 * Jira Sprints API endpoints (via Agile API).
 * @module jira/endpoints/sprints
 */

import { getClient } from '../client.js';
import type { JiraSprint, JiraIssue } from '../types.js';
import { createLogger } from '../../utils/logger.js';
import type { PaginatedResponse } from '../../types/index.js';

const logger = createLogger('jira-sprints');

/**
 * Lists sprints for a board.
 *
 * @param boardId - The board ID
 * @param state - Filter by sprint state
 * @param startAt - Starting index for pagination
 * @param maxResults - Maximum results to return
 * @returns Paginated list of sprints
 *
 * @example
 * const sprints = await listSprints(1, 'active');
 */
export async function listSprints(
  boardId: number,
  state?: 'future' | 'active' | 'closed',
  startAt: number = 0,
  maxResults: number = 50
): Promise<PaginatedResponse<JiraSprint>> {
  logger.debug('Listing sprints', { boardId, state });

  const response = await getClient().get<{
    startAt: number;
    maxResults: number;
    total: number;
    values: JiraSprint[];
    isLast: boolean;
  }>(`/rest/agile/1.0/board/${boardId}/sprint`, {
    params: {
      startAt,
      maxResults,
      state,
    },
  });

  return {
    startAt: response.startAt,
    maxResults: response.maxResults,
    total: response.total ?? response.values.length,
    values: response.values,
    isLast: response.isLast,
  };
}

/**
 * Gets a sprint by ID.
 *
 * @param sprintId - The sprint ID
 * @returns The sprint data
 *
 * @example
 * const sprint = await getSprint(123);
 */
export async function getSprint(sprintId: number): Promise<JiraSprint> {
  logger.debug('Getting sprint', { sprintId });

  return getClient().get<JiraSprint>(`/rest/agile/1.0/sprint/${sprintId}`);
}

/**
 * Gets issues in a sprint.
 *
 * @param sprintId - The sprint ID
 * @param startAt - Starting index for pagination
 * @param maxResults - Maximum results to return
 * @param jql - Additional JQL filter
 * @returns Paginated list of issues
 *
 * @example
 * const issues = await getSprintIssues(123, 0, 50, 'status = "In Progress"');
 */
export async function getSprintIssues(
  sprintId: number,
  startAt: number = 0,
  maxResults: number = 50,
  jql?: string
): Promise<PaginatedResponse<JiraIssue>> {
  logger.debug('Getting sprint issues', { sprintId, jql });

  const response = await getClient().get<{
    startAt: number;
    maxResults: number;
    total: number;
    issues: JiraIssue[];
  }>(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
    params: {
      startAt,
      maxResults,
      jql,
      fields: 'summary,status,assignee,priority,issuetype,created,updated',
    },
  });

  return {
    startAt: response.startAt,
    maxResults: response.maxResults,
    total: response.total,
    values: response.issues,
    isLast: response.startAt + response.issues.length >= response.total,
  };
}

/**
 * Moves issues to a sprint.
 *
 * @param sprintId - The target sprint ID
 * @param issueKeys - Array of issue keys to move
 *
 * @example
 * await moveIssuesToSprint(123, ['PROJ-1', 'PROJ-2']);
 */
export async function moveIssuesToSprint(
  sprintId: number,
  issueKeys: string[]
): Promise<void> {
  logger.debug('Moving issues to sprint', {
    sprintId,
    issueCount: issueKeys.length,
  });

  await getClient().post(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
    body: { issues: issueKeys },
  });
}

/**
 * Gets the active sprint for a board.
 *
 * @param boardId - The board ID
 * @returns The active sprint or null if none
 */
export async function getActiveSprint(
  boardId: number
): Promise<JiraSprint | null> {
  logger.debug('Getting active sprint', { boardId });

  const response = await listSprints(boardId, 'active', 0, 1);
  return response.values[0] ?? null;
}

/**
 * Creates a new sprint.
 *
 * @param boardId - The board ID
 * @param name - Sprint name
 * @param startDate - Optional start date
 * @param endDate - Optional end date
 * @param goal - Optional sprint goal
 * @returns The created sprint
 */
export async function createSprint(
  boardId: number,
  name: string,
  startDate?: string,
  endDate?: string,
  goal?: string
): Promise<JiraSprint> {
  logger.debug('Creating sprint', { boardId, name });

  return getClient().post<JiraSprint>('/rest/agile/1.0/sprint', {
    body: {
      name,
      originBoardId: boardId,
      startDate,
      endDate,
      goal,
    },
  });
}

/**
 * Updates a sprint.
 *
 * @param sprintId - The sprint ID
 * @param updates - Fields to update
 */
export async function updateSprint(
  sprintId: number,
  updates: {
    name?: string;
    state?: 'future' | 'active' | 'closed';
    startDate?: string;
    endDate?: string;
    goal?: string;
  }
): Promise<JiraSprint> {
  logger.debug('Updating sprint', { sprintId });

  return getClient().put<JiraSprint>(`/rest/agile/1.0/sprint/${sprintId}`, {
    body: updates,
  });
}
