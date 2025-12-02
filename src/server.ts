/**
 * MCP Server configuration and tool registration.
 * Uses consolidated tools for reduced complexity.
 * @module server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createLogger } from './utils/logger.js';

// Consolidated tools
import { registerJiraIssuesTool } from './tools/consolidated/jira-issues.js';
import { registerJiraProjectsTool } from './tools/consolidated/jira-projects.js';
import { registerJiraSprintsTool } from './tools/consolidated/jira-sprints.js';
import { registerJiraBoardsTool } from './tools/consolidated/jira-boards.js';
import { registerJiraCommentsTool } from './tools/consolidated/jira-comments.js';
import { registerJiraLinksTool } from './tools/consolidated/jira-links.js';
import { registerJiraWorklogsTool } from './tools/consolidated/jira-worklogs.js';
import { registerJiraUsersTool } from './tools/consolidated/jira-users.js';
import { registerJiraFieldsTool } from './tools/consolidated/jira-fields.js';

const logger = createLogger('mcp-server');

/**
 * Creates and configures the MCP server with all Jira tools.
 *
 * Tool Summary (9 consolidated tools):
 * - jira_issues: Issue CRUD, search, transitions, assignments
 * - jira_projects: Project management and versions
 * - jira_sprints: Sprint management
 * - jira_boards: Board management
 * - jira_comments: Issue comments
 * - jira_links: Issue linking (internal and remote)
 * - jira_worklogs: Time tracking
 * - jira_users: User management
 * - jira_fields: Field discovery
 */
export function createServer(): McpServer {
  logger.info('Creating MCP server with consolidated tools');

  const server = new McpServer({
    name: 'jira-mcp',
    version: '2.0.0',
  });

  // Register all consolidated tools
  registerJiraIssuesTool(server);
  registerJiraProjectsTool(server);
  registerJiraSprintsTool(server);
  registerJiraBoardsTool(server);
  registerJiraCommentsTool(server);
  registerJiraLinksTool(server);
  registerJiraWorklogsTool(server);
  registerJiraUsersTool(server);
  registerJiraFieldsTool(server);

  logger.info('MCP server created with 9 consolidated tools');

  return server;
}
