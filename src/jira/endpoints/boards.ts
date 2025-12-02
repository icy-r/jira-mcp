/**
 * Jira Boards API endpoints (via Agile API).
 * @module jira/endpoints/boards
 */

import { getClient } from '../client.js';
import type { JiraBoard } from '../types.js';
import { createLogger } from '../../utils/logger.js';
import type { PaginatedResponse } from '../../types/index.js';

const logger = createLogger('jira-boards');

/**
 * Lists all boards.
 *
 * @param projectKeyOrId - Filter by project
 * @param type - Filter by board type
 * @param startAt - Starting index for pagination
 * @param maxResults - Maximum results to return
 * @returns Paginated list of boards
 *
 * @example
 * const boards = await listBoards('PROJ', 'scrum');
 */
export async function listBoards(
  projectKeyOrId?: string,
  type?: 'scrum' | 'kanban' | 'simple',
  startAt: number = 0,
  maxResults: number = 50
): Promise<PaginatedResponse<JiraBoard>> {
  logger.debug('Listing boards', { projectKeyOrId, type });

  const response = await getClient().get<{
    startAt: number;
    maxResults: number;
    total: number;
    values: JiraBoard[];
    isLast: boolean;
  }>('/rest/agile/1.0/board', {
    params: {
      startAt,
      maxResults,
      projectKeyOrId,
      type,
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
 * Gets a board by ID.
 *
 * @param boardId - The board ID
 * @returns The board data
 *
 * @example
 * const board = await getBoard(1);
 */
export async function getBoard(boardId: number): Promise<JiraBoard> {
  logger.debug('Getting board', { boardId });

  return getClient().get<JiraBoard>(`/rest/agile/1.0/board/${boardId}`);
}

/**
 * Gets board configuration.
 *
 * @param boardId - The board ID
 * @returns Board configuration including columns and filters
 */
export async function getBoardConfiguration(boardId: number): Promise<{
  id: number;
  name: string;
  type: string;
  filter: {
    id: string;
    self: string;
  };
  columnConfig: {
    columns: Array<{
      name: string;
      statuses: Array<{ id: string; self: string }>;
    }>;
  };
  estimation?: {
    type: string;
    field?: { fieldId: string; displayName: string };
  };
}> {
  logger.debug('Getting board configuration', { boardId });

  return getClient().get(`/rest/agile/1.0/board/${boardId}/configuration`);
}

/**
 * Gets backlog issues for a board.
 *
 * @param boardId - The board ID
 * @param startAt - Starting index for pagination
 * @param maxResults - Maximum results to return
 * @param jql - Additional JQL filter
 * @returns Paginated list of backlog issues
 */
export async function getBoardBacklog(
  boardId: number,
  startAt: number = 0,
  maxResults: number = 50,
  jql?: string
): Promise<PaginatedResponse<{ id: string; key: string; self: string }>> {
  logger.debug('Getting board backlog', { boardId });

  const response = await getClient().get<{
    startAt: number;
    maxResults: number;
    total: number;
    issues: Array<{ id: string; key: string; self: string }>;
  }>(`/rest/agile/1.0/board/${boardId}/backlog`, {
    params: {
      startAt,
      maxResults,
      jql,
      fields: 'summary,status,assignee,priority,issuetype',
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
