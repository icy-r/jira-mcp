/**
 * Jira Versions API endpoints.
 * @module jira/endpoints/versions
 */

import { getClient } from '../client.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('jira-versions');

/**
 * Version representation.
 */
export interface JiraVersion {
  id: string;
  self: string;
  name: string;
  description?: string;
  archived: boolean;
  released: boolean;
  startDate?: string;
  releaseDate?: string;
  userStartDate?: string;
  userReleaseDate?: string;
  projectId: number;
  overdue?: boolean;
}

/**
 * Input for creating a version.
 */
export interface CreateVersionInput {
  projectId: string;
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  archived?: boolean;
  released?: boolean;
}

/**
 * Gets all versions for a project.
 *
 * @param projectIdOrKey - The project key or ID
 * @returns List of versions
 *
 * @example
 * const versions = await getProjectVersions('PROJ');
 */
export async function getProjectVersions(
  projectIdOrKey: string
): Promise<JiraVersion[]> {
  logger.debug('Getting project versions', { projectIdOrKey });

  return getClient().get<JiraVersion[]>(
    `/rest/api/3/project/${projectIdOrKey}/versions`
  );
}

/**
 * Gets a specific version by ID.
 *
 * @param versionId - The version ID
 * @returns The version data
 */
export async function getVersion(versionId: string): Promise<JiraVersion> {
  logger.debug('Getting version', { versionId });

  return getClient().get<JiraVersion>(`/rest/api/3/version/${versionId}`);
}

/**
 * Creates a new version in a project.
 *
 * @param input - Version creation parameters
 * @returns The created version
 *
 * @example
 * const version = await createVersion({
 *   projectId: '10000',
 *   name: 'v1.0.0',
 *   releaseDate: '2024-12-31'
 * });
 */
export async function createVersion(
  input: CreateVersionInput
): Promise<JiraVersion> {
  logger.debug('Creating version', {
    projectId: input.projectId,
    name: input.name,
  });

  return getClient().post<JiraVersion>('/rest/api/3/version', {
    body: {
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      startDate: input.startDate,
      releaseDate: input.releaseDate,
      archived: input.archived ?? false,
      released: input.released ?? false,
    },
  });
}

/**
 * Creates multiple versions in a project (batch).
 *
 * @param projectIdOrKey - The project key or ID
 * @param versions - Array of version names and optional details
 * @returns Array of created versions
 *
 * @example
 * const versions = await batchCreateVersions('PROJ', [
 *   { name: 'v1.0.0' },
 *   { name: 'v1.1.0', releaseDate: '2024-12-31' }
 * ]);
 */
export async function batchCreateVersions(
  projectIdOrKey: string,
  versions: Array<Omit<CreateVersionInput, 'projectId'>>
): Promise<JiraVersion[]> {
  logger.debug('Batch creating versions', {
    projectIdOrKey,
    count: versions.length,
  });

  // Get project ID if key was provided
  let projectId = projectIdOrKey;
  if (isNaN(Number(projectIdOrKey))) {
    const project = await getClient().get<{ id: string }>(
      `/rest/api/3/project/${projectIdOrKey}`
    );
    projectId = project.id;
  }

  // Create versions sequentially (Jira doesn't have a batch endpoint)
  const results: JiraVersion[] = [];
  for (const version of versions) {
    const created = await createVersion({
      ...version,
      projectId,
    });
    results.push(created);
  }

  return results;
}

/**
 * Updates a version.
 *
 * @param versionId - The version ID
 * @param updates - Fields to update
 * @returns The updated version
 */
export async function updateVersion(
  versionId: string,
  updates: {
    name?: string;
    description?: string;
    startDate?: string;
    releaseDate?: string;
    archived?: boolean;
    released?: boolean;
  }
): Promise<JiraVersion> {
  logger.debug('Updating version', { versionId });

  return getClient().put<JiraVersion>(`/rest/api/3/version/${versionId}`, {
    body: updates,
  });
}

/**
 * Deletes a version.
 *
 * @param versionId - The version ID
 * @param moveFixIssuesTo - Version ID to move fix version issues to
 * @param moveAffectedIssuesTo - Version ID to move affected version issues to
 */
export async function deleteVersion(
  versionId: string,
  moveFixIssuesTo?: string,
  moveAffectedIssuesTo?: string
): Promise<void> {
  logger.debug('Deleting version', { versionId });

  await getClient().delete(`/rest/api/3/version/${versionId}`, {
    params: {
      moveFixIssuesTo,
      moveAffectedIssuesTo,
    },
  });
}

/**
 * Releases a version.
 *
 * @param versionId - The version ID
 * @param releaseDate - Optional release date (defaults to today)
 * @returns The updated version
 */
export async function releaseVersion(
  versionId: string,
  releaseDate?: string
): Promise<JiraVersion> {
  logger.debug('Releasing version', { versionId });

  return updateVersion(versionId, {
    released: true,
    releaseDate: releaseDate ?? new Date().toISOString().split('T')[0],
  });
}
