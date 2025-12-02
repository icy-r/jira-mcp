/**
 * Issue tool handlers.
 * @module tools/issues/handlers
 */

import type { z } from 'zod';
import * as issues from '../../jira/endpoints/issues.js';
import { simplifyIssue, simplifyIssues } from '../../formatters/toon.js';
import {
  createSuccessResult,
  createErrorResult,
  createPaginatedResult,
  createActionResult,
} from '../../formatters/response.js';
import { formatErrorForMcp } from '../../utils/errors.js';
import { createLogger } from '../../utils/logger.js';
import type { ToolResult } from '../../types/mcp.js';
import type {
  getIssueSchema,
  createIssueSchema,
  updateIssueSchema,
  deleteIssueSchema,
  searchIssuesSchema,
  transitionIssueSchema,
  getTransitionsSchema,
  assignIssueSchema,
} from './schemas.js';

const logger = createLogger('issue-handlers');

/**
 * Handles getting an issue.
 */
export async function handleGetIssue(
  args: z.infer<typeof getIssueSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting issue', { issueKey: args.issueKey });

    const issue = await issues.getIssue(args.issueKey, args.fields);
    const simplified = simplifyIssue(issue);

    return createSuccessResult(simplified);
  } catch (error) {
    logger.error('Failed to get issue', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles creating an issue.
 */
export async function handleCreateIssue(
  args: z.infer<typeof createIssueSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Creating issue', { projectKey: args.projectKey });

    const issue = await issues.createIssue({
      projectKey: args.projectKey,
      summary: args.summary,
      issueType: args.issueType,
      description: args.description,
      priority: args.priority,
      assignee: args.assignee,
      labels: args.labels,
      components: args.components,
      parentKey: args.parentKey,
    });

    const simplified = simplifyIssue(issue);
    return createSuccessResult({
      message: `Issue ${issue.key} created successfully`,
      issue: simplified,
    });
  } catch (error) {
    logger.error('Failed to create issue', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles updating an issue.
 */
export async function handleUpdateIssue(
  args: z.infer<typeof updateIssueSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Updating issue', { issueKey: args.issueKey });

    await issues.updateIssue(args.issueKey, {
      summary: args.summary,
      description: args.description,
      priority: args.priority,
      assignee: args.assignee,
      labels: args.labels,
    });

    // Fetch updated issue
    const updated = await issues.getIssue(args.issueKey);
    const simplified = simplifyIssue(updated);

    return createSuccessResult({
      message: `Issue ${args.issueKey} updated successfully`,
      issue: simplified,
    });
  } catch (error) {
    logger.error('Failed to update issue', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles deleting an issue.
 */
export async function handleDeleteIssue(
  args: z.infer<typeof deleteIssueSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Deleting issue', { issueKey: args.issueKey });

    await issues.deleteIssue(args.issueKey, args.deleteSubtasks);

    return createActionResult('deleted issue', args.issueKey, {
      subtasksDeleted: args.deleteSubtasks,
    });
  } catch (error) {
    logger.error('Failed to delete issue', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles searching issues.
 */
export async function handleSearchIssues(
  args: z.infer<typeof searchIssuesSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Searching issues', { jql: args.jql });

    const result = await issues.searchIssues({
      jql: args.jql,
      maxResults: args.maxResults,
    });

    const simplified = simplifyIssues(result.issues);

    return createPaginatedResult(
      simplified,
      result.total ?? result.issues.length,
      0,
      'issues'
    );
  } catch (error) {
    logger.error('Failed to search issues', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting transitions.
 */
export async function handleGetTransitions(
  args: z.infer<typeof getTransitionsSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting transitions', { issueKey: args.issueKey });

    const transitions = await issues.getTransitions(args.issueKey);

    const simplified = transitions.map((t) => ({
      id: t.id,
      name: t.name,
      to: t.to.name,
    }));

    return createSuccessResult({
      issueKey: args.issueKey,
      transitions: simplified,
    });
  } catch (error) {
    logger.error('Failed to get transitions', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles transitioning an issue.
 */
export async function handleTransitionIssue(
  args: z.infer<typeof transitionIssueSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Transitioning issue', { issueKey: args.issueKey });

    let transitionId = args.transitionId;

    // If transition name provided, find the ID
    if (!transitionId && args.transitionName) {
      const transitions = await issues.getTransitions(args.issueKey);
      const transition = transitions.find(
        (t) => t.name.toLowerCase() === args.transitionName?.toLowerCase()
      );

      if (!transition) {
        return createErrorResult(
          `Transition "${args.transitionName}" not found`,
          {
            availableTransitions: transitions.map((t) => t.name),
          }
        );
      }

      transitionId = transition.id;
    }

    if (!transitionId) {
      return createErrorResult(
        'Either transitionId or transitionName must be provided'
      );
    }

    await issues.transitionIssue(args.issueKey, transitionId, args.comment);

    // Fetch updated issue
    const updated = await issues.getIssue(args.issueKey);

    return createActionResult('transitioned issue', args.issueKey, {
      newStatus: updated.fields.status.name,
    });
  } catch (error) {
    logger.error('Failed to transition issue', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles assigning an issue.
 */
export async function handleAssignIssue(
  args: z.infer<typeof assignIssueSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Assigning issue', { issueKey: args.issueKey });

    await issues.assignIssue(args.issueKey, args.accountId);

    const action = args.accountId ? 'assigned issue' : 'unassigned issue';
    return createActionResult(action, args.issueKey, {
      assignee: args.accountId ?? 'Unassigned',
    });
  } catch (error) {
    logger.error('Failed to assign issue', error as Error);
    return formatErrorForMcp(error);
  }
}
