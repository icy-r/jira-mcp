/**
 * Zod schemas for user-related tools.
 * @module tools/users/schemas
 */

import { z } from 'zod';

/**
 * Schema for getting current user.
 */
export const getCurrentUserSchema = z.object({});

/**
 * Schema for getting a user.
 */
export const getUserSchema = z.object({
  accountId: z.string().describe("The user's account ID"),
});

/**
 * Schema for searching users.
 */
export const searchUsersSchema = z.object({
  query: z.string().describe('Search query (name, email, etc.)'),
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
 * Schema for getting assignable users.
 */
export const getAssignableUsersSchema = z.object({
  issueKey: z.string().optional().describe('Filter by issue'),
  projectKey: z.string().optional().describe('Filter by project'),
  query: z.string().optional().describe('Search query'),
  maxResults: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(50)
    .describe('Maximum results to return'),
});
