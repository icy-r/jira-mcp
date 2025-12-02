/**
 * Zod schemas for sprint-related tools.
 * @module tools/sprints/schemas
 */

import { z } from 'zod';

/**
 * Schema for listing sprints.
 */
export const listSprintsSchema = z.object({
  boardId: z.number().int().positive().describe('The board ID'),
  state: z
    .enum(['future', 'active', 'closed'])
    .optional()
    .describe('Filter by sprint state'),
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
 * Schema for getting a sprint.
 */
export const getSprintSchema = z.object({
  sprintId: z.number().int().positive().describe('The sprint ID'),
});

/**
 * Schema for getting sprint issues.
 */
export const getSprintIssuesSchema = z.object({
  sprintId: z.number().int().positive().describe('The sprint ID'),
  jql: z.string().optional().describe('Additional JQL filter'),
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
 * Schema for moving issues to sprint.
 */
export const moveToSprintSchema = z.object({
  sprintId: z.number().int().positive().describe('The target sprint ID'),
  issueKeys: z.array(z.string()).min(1).describe('Array of issue keys to move'),
});

/**
 * Schema for getting active sprint.
 */
export const getActiveSprintSchema = z.object({
  boardId: z.number().int().positive().describe('The board ID'),
});

/**
 * Schema for creating a sprint.
 */
export const createSprintSchema = z.object({
  boardId: z.number().int().positive().describe('The board ID'),
  name: z.string().min(1).describe('Sprint name'),
  startDate: z.string().optional().describe('Start date (ISO format)'),
  endDate: z.string().optional().describe('End date (ISO format)'),
  goal: z.string().optional().describe('Sprint goal'),
});
