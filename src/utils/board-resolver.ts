/**
 * Board resolver utility for auto-detecting board IDs from project keys.
 * @module utils/board-resolver
 */

import { listBoards } from '../jira/endpoints/boards.js';
import type { JiraBoard } from '../jira/types.js';
import { createLogger } from './logger.js';

const logger = createLogger('board-resolver');

// Cache for resolved boards
const boardCache = new Map<string, JiraBoard>();

/**
 * Gets the default board for a project.
 * Prefers Scrum boards, then Kanban, then any available board.
 *
 * @param projectKeyOrId - The project key or ID
 * @returns The board or null if none found
 *
 * @example
 * const board = await getDefaultBoard('PROJ');
 * if (board) {
 *   console.log(`Using board: ${board.name} (${board.id})`);
 * }
 */
export async function getDefaultBoard(
  projectKeyOrId: string
): Promise<JiraBoard | null> {
  // Check cache first
  const cached = boardCache.get(projectKeyOrId.toUpperCase());
  if (cached) {
    logger.debug('Using cached board', { projectKeyOrId, boardId: cached.id });
    return cached;
  }

  logger.debug('Resolving default board for project', { projectKeyOrId });

  try {
    const response = await listBoards(projectKeyOrId, undefined, 0, 50);
    const boards = response.values;

    if (boards.length === 0) {
      logger.warn('No boards found for project', { projectKeyOrId });
      return null;
    }

    // Prefer Scrum boards for sprint functionality
    let board: JiraBoard | undefined = boards.find((b) => b.type === 'scrum');

    // Fall back to Kanban
    if (!board) {
      board = boards.find((b) => b.type === 'kanban');
    }

    // Fall back to any board
    if (!board) {
      board = boards[0];
    }

    if (!board) {
      return null;
    }

    // Cache the result
    boardCache.set(projectKeyOrId.toUpperCase(), board);

    logger.debug('Resolved board', {
      projectKeyOrId,
      boardId: board.id,
      boardName: board.name,
      boardType: board.type,
    });

    return board;
  } catch (err) {
    logger.error(
      'Failed to resolve board',
      err instanceof Error ? err : new Error(String(err)),
      { projectKeyOrId }
    );
    return null;
  }
}

/**
 * Gets the default board ID for a project.
 * Convenience wrapper that returns just the ID.
 *
 * @param projectKeyOrId - The project key or ID
 * @returns The board ID or null if none found
 */
export async function getDefaultBoardId(
  projectKeyOrId: string
): Promise<number | null> {
  const board = await getDefaultBoard(projectKeyOrId);
  return board?.id ?? null;
}

/**
 * Resolves a board ID from either an explicit ID or a project key.
 * If boardId is provided, uses that. Otherwise, auto-detects from projectKey.
 *
 * @param boardId - Optional explicit board ID
 * @param projectKey - Optional project key for auto-detection
 * @returns The resolved board ID
 * @throws Error if neither boardId nor projectKey is provided, or if no board found
 *
 * @example
 * // Explicit board ID
 * const id = await resolveBoardId(123);
 *
 * // Auto-detect from project
 * const id = await resolveBoardId(undefined, 'PROJ');
 */
export async function resolveBoardId(
  boardId?: number,
  projectKey?: string
): Promise<number> {
  if (boardId) {
    return boardId;
  }

  if (!projectKey) {
    throw new Error(
      'Either boardId or projectKey must be provided for sprint operations'
    );
  }

  const resolvedId = await getDefaultBoardId(projectKey);
  if (!resolvedId) {
    throw new Error(
      `No board found for project ${projectKey}. Please specify a boardId explicitly.`
    );
  }

  return resolvedId;
}

/**
 * Gets all boards for a project.
 *
 * @param projectKeyOrId - The project key or ID
 * @returns List of boards
 */
export async function getProjectBoards(
  projectKeyOrId: string
): Promise<JiraBoard[]> {
  logger.debug('Getting all boards for project', { projectKeyOrId });

  const response = await listBoards(projectKeyOrId, undefined, 0, 100);
  return response.values;
}

/**
 * Clears the board cache.
 * Call this if boards have been added/removed/renamed.
 */
export function clearBoardCache(): void {
  boardCache.clear();
}

/**
 * Extracts project key from an issue key.
 *
 * @param issueKey - The issue key (e.g., "PROJ-123")
 * @returns The project key (e.g., "PROJ")
 */
export function extractProjectKey(issueKey: string): string {
  const match = issueKey.match(/^([A-Z][A-Z0-9]*)-\d+$/i);
  if (!match || !match[1]) {
    throw new Error(`Invalid issue key format: ${issueKey}`);
  }
  return match[1].toUpperCase();
}

/**
 * Resolves board ID from an issue key by extracting the project.
 *
 * @param issueKey - The issue key (e.g., "PROJ-123")
 * @returns The resolved board ID
 */
export async function resolveBoardIdFromIssue(
  issueKey: string
): Promise<number> {
  const projectKey = extractProjectKey(issueKey);
  return resolveBoardId(undefined, projectKey);
}
