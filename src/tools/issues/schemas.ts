/**
 * Zod schemas for issue-related tools.
 * @module tools/issues/schemas
 */

import { z } from 'zod';

/**
 * Schema for getting an issue.
 */
export const getIssueSchema = z.object({
  issueKey: z.string().describe('The issue key (e.g., "PROJ-123") or issue ID'),
  fields: z
    .array(z.string())
    .optional()
    .describe('Specific fields to return (optional)'),
});

/**
 * Schema for creating an issue.
 */
export const createIssueSchema = z.object({
  projectKey: z.string().describe('The project key (e.g., "PROJ")'),
  summary: z.string().min(1).describe('Issue summary/title'),
  issueType: z
    .string()
    .describe('Issue type (e.g., "Bug", "Task", "Story", "Epic")'),
  description: z.string().optional().describe('Issue description'),
  priority: z
    .string()
    .optional()
    .describe('Priority (e.g., "High", "Medium", "Low")'),
  assignee: z.string().optional().describe("Assignee's account ID"),
  labels: z.array(z.string()).optional().describe('Labels to add'),
  components: z.array(z.string()).optional().describe('Component names'),
  parentKey: z
    .string()
    .optional()
    .describe('Parent issue key (for subtasks or child issues)'),
});

/**
 * Schema for updating an issue.
 */
export const updateIssueSchema = z.object({
  issueKey: z.string().describe('The issue key to update'),
  summary: z.string().optional().describe('New summary'),
  description: z.string().optional().describe('New description'),
  priority: z.string().optional().describe('New priority'),
  assignee: z
    .string()
    .nullable()
    .optional()
    .describe('New assignee account ID (null to unassign)'),
  labels: z
    .array(z.string())
    .optional()
    .describe('New labels (replaces existing)'),
});

/**
 * Schema for deleting an issue.
 */
export const deleteIssueSchema = z.object({
  issueKey: z.string().describe('The issue key to delete'),
  deleteSubtasks: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to delete subtasks'),
});

/**
 * Schema for searching issues.
 */
export const searchIssuesSchema = z.object({
  jql: z
    .string()
    .describe(
      'JQL query (e.g., "project = PROJ AND status = Open ORDER BY created DESC")'
    ),
  maxResults: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(50)
    .describe('Maximum results to return (max 100)'),
  startAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe('Starting index for pagination'),
});

/**
 * Schema for transitioning an issue.
 */
export const transitionIssueSchema = z.object({
  issueKey: z.string().describe('The issue key to transition'),
  transitionId: z
    .string()
    .optional()
    .describe('Transition ID (use get_transitions to find available ones)'),
  transitionName: z
    .string()
    .optional()
    .describe('Transition name (alternative to transitionId)'),
  comment: z.string().optional().describe('Comment to add with the transition'),
});

/**
 * Schema for getting transitions.
 */
export const getTransitionsSchema = z.object({
  issueKey: z.string().describe('The issue key'),
});

/**
 * Schema for assigning an issue.
 */
export const assignIssueSchema = z.object({
  issueKey: z.string().describe('The issue key'),
  accountId: z
    .string()
    .nullable()
    .describe('Account ID of the assignee (null to unassign)'),
});
