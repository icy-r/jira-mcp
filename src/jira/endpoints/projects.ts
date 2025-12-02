/**
 * Jira Projects API endpoints.
 * @module jira/endpoints/projects
 */

import { getClient } from '../client.js';
import type { JiraProject, JiraIssueType, JiraStatus } from '../types.js';
import { createLogger } from '../../utils/logger.js';
import type { PaginatedResponse } from '../../types/index.js';

const logger = createLogger('jira-projects');

/**
 * Lists all projects accessible to the user.
 *
 * @param startAt - Starting index for pagination
 * @param maxResults - Maximum results to return
 * @returns Paginated list of projects
 *
 * @example
 * const projects = await listProjects(0, 50);
 */
export async function listProjects(
  startAt: number = 0,
  maxResults: number = 50
): Promise<PaginatedResponse<JiraProject>> {
  logger.debug('Listing projects', { startAt, maxResults });

  const response = await getClient().get<{
    startAt: number;
    maxResults: number;
    total: number;
    values: JiraProject[];
    isLast: boolean;
  }>('/rest/api/3/project/search', {
    params: {
      startAt,
      maxResults,
      expand: 'description,lead',
    },
  });

  return {
    startAt: response.startAt,
    maxResults: response.maxResults,
    total: response.total,
    values: response.values,
    isLast: response.isLast,
  };
}

/**
 * Gets a project by key or ID.
 *
 * @param projectIdOrKey - The project key (e.g., "PROJ") or ID
 * @returns The project data
 *
 * @example
 * const project = await getProject('PROJ');
 */
export async function getProject(projectIdOrKey: string): Promise<JiraProject> {
  logger.debug('Getting project', { projectIdOrKey });

  return getClient().get<JiraProject>(`/rest/api/3/project/${projectIdOrKey}`, {
    params: {
      expand: 'description,lead,issueTypes',
    },
  });
}

/**
 * Gets issue types for a project.
 *
 * @param projectIdOrKey - The project key or ID
 * @returns List of issue types
 *
 * @example
 * const types = await getProjectIssueTypes('PROJ');
 */
export async function getProjectIssueTypes(
  projectIdOrKey: string
): Promise<JiraIssueType[]> {
  logger.debug('Getting project issue types', { projectIdOrKey });

  const response = await getClient().get<JiraIssueType[]>(
    `/rest/api/3/project/${projectIdOrKey}/statuses`
  );

  // Extract unique issue types from the response
  const issueTypes = new Map<string, JiraIssueType>();
  for (const item of response) {
    if (!issueTypes.has(item.id)) {
      issueTypes.set(item.id, item);
    }
  }

  return Array.from(issueTypes.values());
}

/**
 * Gets all statuses for a project.
 *
 * @param projectIdOrKey - The project key or ID
 * @returns List of statuses grouped by issue type
 *
 * @example
 * const statuses = await getProjectStatuses('PROJ');
 */
export async function getProjectStatuses(
  projectIdOrKey: string
): Promise<Array<{ issueType: JiraIssueType; statuses: JiraStatus[] }>> {
  logger.debug('Getting project statuses', { projectIdOrKey });

  const response = await getClient().get<
    Array<{
      self: string;
      id: string;
      name: string;
      subtask: boolean;
      statuses: JiraStatus[];
    }>
  >(`/rest/api/3/project/${projectIdOrKey}/statuses`);

  return response.map((item) => ({
    issueType: {
      id: item.id,
      name: item.name,
      subtask: item.subtask,
    },
    statuses: item.statuses,
  }));
}

/**
 * Gets components for a project.
 *
 * @param projectIdOrKey - The project key or ID
 * @returns List of components
 */
export async function getProjectComponents(
  projectIdOrKey: string
): Promise<Array<{ id: string; name: string; description?: string }>> {
  logger.debug('Getting project components', { projectIdOrKey });

  return getClient().get<
    Array<{ id: string; name: string; description?: string }>
  >(`/rest/api/3/project/${projectIdOrKey}/components`);
}

/**
 * Gets versions for a project.
 *
 * @param projectIdOrKey - The project key or ID
 * @returns List of versions
 */
export async function getProjectVersions(projectIdOrKey: string): Promise<
  Array<{
    id: string;
    name: string;
    description?: string;
    released: boolean;
    releaseDate?: string;
  }>
> {
  logger.debug('Getting project versions', { projectIdOrKey });

  return getClient().get<
    Array<{
      id: string;
      name: string;
      description?: string;
      released: boolean;
      releaseDate?: string;
    }>
  >(`/rest/api/3/project/${projectIdOrKey}/versions`);
}
