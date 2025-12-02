/**
 * Consolidated Jira Projects Tool.
 * Combines all project-related operations into a single action-based tool.
 * @module tools/consolidated/jira-projects
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  listProjects,
  getProject,
  getProjectStatuses,
  getProjectComponents,
} from '../../jira/endpoints/projects.js';
import {
  getProjectVersions,
  createVersion,
  batchCreateVersions,
  updateVersion,
  releaseVersion,
} from '../../jira/endpoints/versions.js';
import { encodeToon, simplifyProject } from '../../formatters/toon.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('tool-jira-projects');

/**
 * Schema for the jira_projects tool.
 */
const jiraProjectsSchema = z.object({
  action: z
    .enum([
      'list',
      'get',
      'get_statuses',
      'get_components',
      'get_versions',
      'create_version',
      'batch_create_versions',
      'update_version',
      'release_version',
    ])
    .describe('The action to perform'),

  // Common fields
  projectKey: z
    .string()
    .optional()
    .describe('Project key (e.g., "PROJ") - required for most actions'),

  // Get options
  full: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return full data instead of minimal fields (default: false)'),

  // List pagination
  maxResults: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum results for list (default: 50)'),
  startAt: z
    .number()
    .optional()
    .default(0)
    .describe('Starting index for pagination'),

  // Version fields
  versionId: z
    .string()
    .optional()
    .describe('Version ID for update/release actions'),
  versionName: z.string().optional().describe('Version name for create'),
  versionDescription: z.string().optional().describe('Version description'),
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  releaseDate: z.string().optional().describe('Release date (YYYY-MM-DD)'),
  released: z.boolean().optional().describe('Whether version is released'),
  archived: z.boolean().optional().describe('Whether version is archived'),

  // Batch version creation
  versions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        startDate: z.string().optional(),
        releaseDate: z.string().optional(),
      })
    )
    .optional()
    .describe('Array of versions for batch_create_versions'),
});

type JiraProjectsInput = z.infer<typeof jiraProjectsSchema>;

/**
 * Handler for the jira_projects tool.
 */
async function handleJiraProjects(input: JiraProjectsInput): Promise<string> {
  const { action } = input;

  switch (action) {
    case 'list': {
      const response = await listProjects(
        input.startAt ?? 0,
        input.maxResults ?? 50
      );

      if (input.full) {
        return JSON.stringify(response, null, 2);
      }

      const simplified = response.values.map(simplifyProject);
      return encodeToon({
        projects: simplified,
        total: response.total,
        hasMore: !response.isLast,
      });
    }

    case 'get': {
      if (!input.projectKey) {
        throw new Error('projectKey is required for get action');
      }

      const project = await getProject(input.projectKey);

      if (input.full) {
        return JSON.stringify(project, null, 2);
      }

      return encodeToon(simplifyProject(project));
    }

    case 'get_statuses': {
      if (!input.projectKey) {
        throw new Error('projectKey is required for get_statuses action');
      }

      const statuses = await getProjectStatuses(input.projectKey);

      if (input.full) {
        return JSON.stringify(statuses, null, 2);
      }

      const simplified = statuses.map((item) => ({
        issueType: item.issueType.name,
        statuses: item.statuses.map((s) => s.name),
      }));

      return encodeToon({ statusesByType: simplified });
    }

    case 'get_components': {
      if (!input.projectKey) {
        throw new Error('projectKey is required for get_components action');
      }

      const components = await getProjectComponents(input.projectKey);

      if (input.full) {
        return JSON.stringify(components, null, 2);
      }

      const simplified = components.map((c) => ({
        id: c.id,
        name: c.name,
      }));

      return encodeToon({ components: simplified });
    }

    case 'get_versions': {
      if (!input.projectKey) {
        throw new Error('projectKey is required for get_versions action');
      }

      const versions = await getProjectVersions(input.projectKey);

      if (input.full) {
        return JSON.stringify(versions, null, 2);
      }

      const simplified = versions.map((v) => ({
        id: v.id,
        name: v.name,
        released: v.released,
        releaseDate: v.releaseDate,
      }));

      return encodeToon({ versions: simplified });
    }

    case 'create_version': {
      if (!input.projectKey || !input.versionName) {
        throw new Error(
          'projectKey and versionName are required for create_version action'
        );
      }

      // Get project ID from key
      const project = await getProject(input.projectKey);

      const version = await createVersion({
        projectId: project.id,
        name: input.versionName,
        description: input.versionDescription,
        startDate: input.startDate,
        releaseDate: input.releaseDate,
        released: input.released,
        archived: input.archived,
      });

      return encodeToon({
        success: true,
        version: {
          id: version.id,
          name: version.name,
          released: version.released,
        },
      });
    }

    case 'batch_create_versions': {
      if (!input.projectKey || !input.versions?.length) {
        throw new Error(
          'projectKey and versions array are required for batch_create_versions'
        );
      }

      const created = await batchCreateVersions(
        input.projectKey,
        input.versions
      );

      return encodeToon({
        success: true,
        created: created.map((v) => ({ id: v.id, name: v.name })),
      });
    }

    case 'update_version': {
      if (!input.versionId) {
        throw new Error('versionId is required for update_version action');
      }

      const version = await updateVersion(input.versionId, {
        name: input.versionName,
        description: input.versionDescription,
        startDate: input.startDate,
        releaseDate: input.releaseDate,
        released: input.released,
        archived: input.archived,
      });

      return encodeToon({
        success: true,
        version: { id: version.id, name: version.name },
      });
    }

    case 'release_version': {
      if (!input.versionId) {
        throw new Error('versionId is required for release_version action');
      }

      const version = await releaseVersion(input.versionId, input.releaseDate);

      return encodeToon({
        success: true,
        version: {
          id: version.id,
          name: version.name,
          released: version.released,
          releaseDate: version.releaseDate,
        },
      });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_projects tool with the MCP server.
 */
export function registerJiraProjectsTool(server: McpServer): void {
  server.tool(
    'jira_projects',
    `Manage Jira projects and versions. Actions:
- list: List all accessible projects
- get: Get project details
- get_statuses: Get available statuses by issue type
- get_components: Get project components
- get_versions: Get project versions/releases
- create_version: Create a new version
- batch_create_versions: Create multiple versions at once
- update_version: Update version details
- release_version: Mark a version as released`,
    jiraProjectsSchema.shape,
    async (params) => {
      try {
        const input = jiraProjectsSchema.parse(params);
        const result = await handleJiraProjects(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_projects error',
          err instanceof Error ? err : new Error(String(err))
        );
        const message = err instanceof Error ? err.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
