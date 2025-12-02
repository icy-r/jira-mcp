/**
 * Sprint tool handlers.
 * @module tools/sprints/handlers
 */

import type { z } from 'zod';
import * as sprints from '../../jira/endpoints/sprints.js';
import { simplifySprint, simplifyIssues } from '../../formatters/toon.js';
import {
  createSuccessResult,
  createPaginatedResult,
  createActionResult,
  createTextResult,
} from '../../formatters/response.js';
import { formatErrorForMcp } from '../../utils/errors.js';
import { createLogger } from '../../utils/logger.js';
import type { ToolResult } from '../../types/mcp.js';
import type {
  listSprintsSchema,
  getSprintSchema,
  getSprintIssuesSchema,
  moveToSprintSchema,
  getActiveSprintSchema,
  createSprintSchema,
} from './schemas.js';

const logger = createLogger('sprint-handlers');

/**
 * Handles listing sprints.
 */
export async function handleListSprints(
  args: z.infer<typeof listSprintsSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Listing sprints', { boardId: args.boardId });

    const result = await sprints.listSprints(
      args.boardId,
      args.state,
      0,
      args.maxResults
    );

    const simplified = result.values.map(simplifySprint);

    return createPaginatedResult(
      simplified,
      result.total,
      result.startAt,
      'sprints'
    );
  } catch (error) {
    logger.error('Failed to list sprints', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting a sprint.
 */
export async function handleGetSprint(
  args: z.infer<typeof getSprintSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting sprint', { sprintId: args.sprintId });

    const sprint = await sprints.getSprint(args.sprintId);
    const simplified = simplifySprint(sprint);

    return createSuccessResult(simplified);
  } catch (error) {
    logger.error('Failed to get sprint', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting sprint issues.
 */
export async function handleGetSprintIssues(
  args: z.infer<typeof getSprintIssuesSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting sprint issues', { sprintId: args.sprintId });

    const result = await sprints.getSprintIssues(
      args.sprintId,
      0,
      args.maxResults,
      args.jql
    );

    const simplified = simplifyIssues(result.values);

    return createPaginatedResult(
      simplified,
      result.total,
      result.startAt,
      'issues'
    );
  } catch (error) {
    logger.error('Failed to get sprint issues', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles moving issues to sprint.
 */
export async function handleMoveToSprint(
  args: z.infer<typeof moveToSprintSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Moving issues to sprint', {
      sprintId: args.sprintId,
      issueCount: args.issueKeys.length,
    });

    await sprints.moveIssuesToSprint(args.sprintId, args.issueKeys);

    return createActionResult(
      'moved issues to sprint',
      `Sprint ${args.sprintId}`,
      {
        issuesMoved: args.issueKeys,
        count: args.issueKeys.length,
      }
    );
  } catch (error) {
    logger.error('Failed to move issues to sprint', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting active sprint.
 */
export async function handleGetActiveSprint(
  args: z.infer<typeof getActiveSprintSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting active sprint', { boardId: args.boardId });

    const sprint = await sprints.getActiveSprint(args.boardId);

    if (!sprint) {
      return createTextResult(
        `No active sprint found for board ${args.boardId}`
      );
    }

    const simplified = simplifySprint(sprint);
    return createSuccessResult(simplified);
  } catch (error) {
    logger.error('Failed to get active sprint', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles creating a sprint.
 */
export async function handleCreateSprint(
  args: z.infer<typeof createSprintSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Creating sprint', { boardId: args.boardId, name: args.name });

    const sprint = await sprints.createSprint(
      args.boardId,
      args.name,
      args.startDate,
      args.endDate,
      args.goal
    );

    const simplified = simplifySprint(sprint);

    return createSuccessResult({
      message: `Sprint "${args.name}" created successfully`,
      sprint: simplified,
    });
  } catch (error) {
    logger.error('Failed to create sprint', error as Error);
    return formatErrorForMcp(error);
  }
}
