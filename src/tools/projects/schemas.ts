/**
 * Zod schemas for project-related tools.
 * @module tools/projects/schemas
 */

import { z } from 'zod';

/**
 * Schema for listing projects.
 */
export const listProjectsSchema = z.object({
  maxResults: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(50)
    .describe('Maximum results to return'),
  startAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe('Starting index for pagination'),
});

/**
 * Schema for getting a project.
 */
export const getProjectSchema = z.object({
  projectKey: z.string().describe('The project key (e.g., "PROJ") or ID'),
});

/**
 * Schema for getting project statuses.
 */
export const getProjectStatusesSchema = z.object({
  projectKey: z.string().describe('The project key'),
});

/**
 * Schema for listing boards.
 */
export const listBoardsSchema = z.object({
  projectKey: z.string().optional().describe('Filter by project key'),
  type: z
    .enum(['scrum', 'kanban', 'simple'])
    .optional()
    .describe('Filter by board type'),
  maxResults: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(50)
    .describe('Maximum results to return'),
});

/**
 * Schema for getting a board.
 */
export const getBoardSchema = z.object({
  boardId: z.number().int().positive().describe('The board ID'),
});

/**
 * Schema for getting board configuration.
 */
export const getBoardConfigSchema = z.object({
  boardId: z.number().int().positive().describe('The board ID'),
});
