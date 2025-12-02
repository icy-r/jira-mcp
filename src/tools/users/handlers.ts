/**
 * User tool handlers.
 * @module tools/users/handlers
 */

import type { z } from 'zod';
import * as users from '../../jira/endpoints/users.js';
import { simplifyUser } from '../../formatters/toon.js';
import {
  createSuccessResult,
  createListResult,
  createErrorResult,
} from '../../formatters/response.js';
import { formatErrorForMcp } from '../../utils/errors.js';
import { createLogger } from '../../utils/logger.js';
import type { ToolResult } from '../../types/mcp.js';
import type {
  getCurrentUserSchema,
  getUserSchema,
  searchUsersSchema,
  getAssignableUsersSchema,
} from './schemas.js';

const logger = createLogger('user-handlers');

/**
 * Handles getting current user.
 */
export async function handleGetCurrentUser(
  _args: z.infer<typeof getCurrentUserSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting current user');

    const user = await users.getCurrentUser();
    const simplified = simplifyUser(user);

    return createSuccessResult(simplified);
  } catch (error) {
    logger.error('Failed to get current user', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting a user.
 */
export async function handleGetUser(
  args: z.infer<typeof getUserSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting user', { accountId: args.accountId });

    const user = await users.getUser(args.accountId);
    const simplified = simplifyUser(user);

    return createSuccessResult(simplified);
  } catch (error) {
    logger.error('Failed to get user', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles searching users.
 */
export async function handleSearchUsers(
  args: z.infer<typeof searchUsersSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Searching users', { query: args.query });

    const userList = await users.searchUsers(args.query, args.maxResults);
    const simplified = userList.map(simplifyUser);

    return createListResult(simplified, 'users');
  } catch (error) {
    logger.error('Failed to search users', error as Error);
    return formatErrorForMcp(error);
  }
}

/**
 * Handles getting assignable users.
 */
export async function handleGetAssignableUsers(
  args: z.infer<typeof getAssignableUsersSchema>
): Promise<ToolResult> {
  try {
    logger.debug('Getting assignable users', {
      issueKey: args.issueKey,
      projectKey: args.projectKey,
    });

    if (!args.issueKey && !args.projectKey) {
      return createErrorResult(
        'Either issueKey or projectKey must be provided'
      );
    }

    let userList;
    if (args.issueKey) {
      userList = await users.getAssignableUsers(
        args.issueKey,
        args.query,
        args.maxResults
      );
    } else {
      userList = await users.getProjectAssignableUsers(
        args.projectKey!,
        args.query,
        args.maxResults
      );
    }

    const simplified = userList.map(simplifyUser);

    return createListResult(simplified, 'users');
  } catch (error) {
    logger.error('Failed to get assignable users', error as Error);
    return formatErrorForMcp(error);
  }
}
