/**
 * Zod schemas for comment-related tools.
 * @module tools/comments/schemas
 */

import { z } from 'zod';

/**
 * Schema for getting comments.
 */
export const getCommentsSchema = z.object({
  issueKey: z.string().describe('The issue key'),
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
 * Schema for adding a comment.
 */
export const addCommentSchema = z.object({
  issueKey: z.string().describe('The issue key'),
  body: z.string().min(1).describe('Comment body text'),
  visibility: z
    .object({
      type: z.enum(['group', 'role']),
      value: z.string(),
    })
    .optional()
    .describe('Optional visibility restriction'),
});

/**
 * Schema for updating a comment.
 */
export const updateCommentSchema = z.object({
  issueKey: z.string().describe('The issue key'),
  commentId: z.string().describe('The comment ID'),
  body: z.string().min(1).describe('New comment body'),
});

/**
 * Schema for deleting a comment.
 */
export const deleteCommentSchema = z.object({
  issueKey: z.string().describe('The issue key'),
  commentId: z.string().describe('The comment ID'),
});
