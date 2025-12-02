/**
 * Jira Users API endpoints.
 * @module jira/endpoints/users
 */

import { getClient } from '../client.js';
import type { JiraUser } from '../types.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('jira-users');

/**
 * Gets the current user.
 *
 * @returns The current user's data
 *
 * @example
 * const me = await getCurrentUser();
 */
export async function getCurrentUser(): Promise<JiraUser> {
  logger.debug('Getting current user');

  return getClient().get<JiraUser>('/rest/api/3/myself');
}

/**
 * Gets a user by account ID.
 *
 * @param accountId - The user's account ID
 * @returns The user data
 *
 * @example
 * const user = await getUser('5b10ac8d82e05b22cc7d4ef5');
 */
export async function getUser(accountId: string): Promise<JiraUser> {
  logger.debug('Getting user', { accountId });

  return getClient().get<JiraUser>('/rest/api/3/user', {
    params: { accountId },
  });
}

/**
 * Searches for users by query.
 *
 * @param query - Search query (name, email, etc.)
 * @param maxResults - Maximum results to return
 * @returns List of matching users
 *
 * @example
 * const users = await searchUsers('john');
 */
export async function searchUsers(
  query: string,
  maxResults: number = 50
): Promise<JiraUser[]> {
  logger.debug('Searching users', { query });

  return getClient().get<JiraUser[]>('/rest/api/3/user/search', {
    params: {
      query,
      maxResults,
    },
  });
}

/**
 * Gets users assignable to an issue.
 *
 * @param issueKey - The issue key
 * @param query - Optional search query
 * @param maxResults - Maximum results to return
 * @returns List of assignable users
 *
 * @example
 * const users = await getAssignableUsers('PROJ-123');
 */
export async function getAssignableUsers(
  issueKey: string,
  query?: string,
  maxResults: number = 50
): Promise<JiraUser[]> {
  logger.debug('Getting assignable users', { issueKey, query });

  return getClient().get<JiraUser[]>('/rest/api/3/user/assignable/search', {
    params: {
      issueKey,
      query,
      maxResults,
    },
  });
}

/**
 * Gets users assignable to issues in a project.
 *
 * @param projectKey - The project key
 * @param query - Optional search query
 * @param maxResults - Maximum results to return
 * @returns List of assignable users
 */
export async function getProjectAssignableUsers(
  projectKey: string,
  query?: string,
  maxResults: number = 50
): Promise<JiraUser[]> {
  logger.debug('Getting project assignable users', { projectKey, query });

  return getClient().get<JiraUser[]>('/rest/api/3/user/assignable/search', {
    params: {
      project: projectKey,
      query,
      maxResults,
    },
  });
}

/**
 * Bulk gets users by account IDs.
 *
 * @param accountIds - Array of account IDs
 * @returns List of users
 */
export async function bulkGetUsers(accountIds: string[]): Promise<JiraUser[]> {
  logger.debug('Bulk getting users', { count: accountIds.length });

  const response = await getClient().get<{ values: JiraUser[] }>(
    '/rest/api/3/user/bulk',
    {
      params: {
        accountId: accountIds.join(','),
      },
    }
  );

  return response.values;
}
