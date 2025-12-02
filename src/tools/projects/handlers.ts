/**
 * Project and board tool handlers.
 * @module tools/projects/handlers
 */

import type { z } from 'zod';
import * as projects from '../../jira/endpoints/projects.js';
import * as boards from '../../jira/endpoints/boards.js';
import { simplifyProject } from '../../formatters/toon.js';
import {
  createSuccessResult,
  createPaginatedResult,
} from '../../formatters/response.js';
import { formatErrorForMcp } from '../../utils/errors.js';
import { createLogger } from '../../utils/logger.js';
import type { ToolResult } from '../../types/mcp.js';
import type {
  listProjectsSchema,
  getProjectSchema,
  getProjectStatusesSchema,
  listBoardsSchema,
  getBoardSchema,
  getBoardConfigSchema,
} from './schemas.js';

const logger = createLogger('project-handlers');

/**
 * Handles listing projects.
 */
export async function handleListProjects(
  args: z.infer<typeof listProjectsSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Listing projects');

    const result = await projects.listProjects(args.startAt, args.maxResults);
    const simplified = result.values.map(simplifyProject);

    return createPaginatedResult(
      simplified,
      result.total,
      result.startAt,
      'projects'
    );
  } catch (error) {
    logger.error('Failed to list projects', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting a project.
 */
export async function handleGetProject(
  args: z.infer<typeof getProjectSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting project', { projectKey: args.projectKey });

    const project = await projects.getProject(args.projectKey);
    const simplified = simplifyProject(project);

    return createSuccessResult(simplified);
  } catch (error) {
    logger.error('Failed to get project', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting project statuses.
 */
export async function handleGetProjectStatuses(
  args: z.infer<typeof getProjectStatusesSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting project statuses', { projectKey: args.projectKey });

    const statuses = await projects.getProjectStatuses(args.projectKey);

    const simplified = statuses.map((s) => ({
      issueType: s.issueType.name,
      statuses: s.statuses.map((st) => ({
        id: st.id,
        name: st.name,
        category: st.statusCategory?.name,
      })),
    }));

    return createSuccessResult({
      projectKey: args.projectKey,
      statusesByType: simplified,
    });
  } catch (error) {
    logger.error('Failed to get project statuses', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles listing boards.
 */
export async function handleListBoards(
  args: z.infer<typeof listBoardsSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Listing boards', { projectKey: args.projectKey });

    const result = await boards.listBoards(
      args.projectKey,
      args.type,
      0,
      args.maxResults
    );

    const simplified = result.values.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      project: b.location?.projectKey,
    }));

    return createPaginatedResult(
      simplified,
      result.total,
      result.startAt,
      'boards'
    );
  } catch (error) {
    logger.error('Failed to list boards', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting a board.
 */
export async function handleGetBoard(
  args: z.infer<typeof getBoardSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting board', { boardId: args.boardId });

    const board = await boards.getBoard(args.boardId);

    return createSuccessResult({
      id: board.id,
      name: board.name,
      type: board.type,
      project: board.location?.projectKey,
    });
  } catch (error) {
    logger.error('Failed to get board', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting board configuration.
 */
export async function handleGetBoardConfig(
  args: z.infer<typeof getBoardConfigSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting board configuration', { boardId: args.boardId });

    const config = await boards.getBoardConfiguration(args.boardId);

    const simplified = {
      id: config.id,
      name: config.name,
      type: config.type,
      columns: config.columnConfig.columns.map((c) => ({
        name: c.name,
        statusCount: c.statuses.length,
      })),
      estimation: config.estimation?.type,
    };

    return createSuccessResult(simplified);
  } catch (error) {
    logger.error('Failed to get board configuration', error as Error);
    return formatErrorForMcp(error);
  }
}
