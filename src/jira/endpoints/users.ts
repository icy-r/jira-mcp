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

/**
 * Resolves a user identifier to an account ID.
 * Accepts email address, display name, or account ID.
 *
 * @param identifier - Email, display name, or account ID
 * @returns The resolved account ID
 * @throws Error if user cannot be found
 *
 * @example
 * const accountId = await resolveUserIdentifier('john@example.com');
 * const accountId = await resolveUserIdentifier('John Doe');
 * const accountId = await resolveUserIdentifier('5b10ac8d82e05b22cc7d4ef5');
 */
export async function resolveUserIdentifier(
  identifier: string
): Promise<string> {
  logger.debug('Resolving user identifier', { identifier });

  // If it looks like an account ID (starts with specific patterns), try direct lookup
  if (
    identifier.startsWith('accountid:') ||
    identifier.startsWith('5') ||
    identifier.startsWith('6')
  ) {
    const cleanId = identifier.replace(/^accountid:/, '');
    try {
      const user = await getUser(cleanId);
      return user.accountId;
    } catch {
      // Fall through to search
    }
  }

  // Search by email or display name
  const users = await searchUsers(identifier, 10);

  if (users.length === 0) {
    throw new Error(`User not found: ${identifier}`);
  }

  // Try exact email match first
  const emailMatch = users.find(
    (u) => u.emailAddress?.toLowerCase() === identifier.toLowerCase()
  );
  if (emailMatch) {
    return emailMatch.accountId;
  }

  // Try exact display name match
  const nameMatch = users.find(
    (u) => u.displayName?.toLowerCase() === identifier.toLowerCase()
  );
  if (nameMatch) {
    return nameMatch.accountId;
  }

  // Return first result if no exact match
  const firstUser = users[0];
  if (!firstUser) {
    throw new Error(`User not found: ${identifier}`);
  }
  logger.debug('Using first search result for user', {
    identifier,
    accountId: firstUser.accountId,
  });
  return firstUser.accountId;
}
