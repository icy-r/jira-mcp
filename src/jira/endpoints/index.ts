/**
 * Jira API endpoints exports.
 * @module jira/endpoints
 */

export * from './issues.js';
export * from './projects.js';
export * from './sprints.js';
export * from './boards.js';
export * from './users.js';
export * from './comments.js';
export * from './worklogs.js';
export * from './links.js';
export {
  getProjectVersions as getVersions,
  getVersion,
  createVersion,
  batchCreateVersions,
  updateVersion,
  deleteVersion,
  releaseVersion,
  type JiraVersion,
  type CreateVersionInput,
} from './versions.js';
export * from './fields.js';
