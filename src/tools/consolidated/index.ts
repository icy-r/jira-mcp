/**
 * Consolidated Jira MCP Tools.
 * Exports all consolidated tools for registration with the MCP server.
 * @module tools/consolidated
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerJiraIssuesTool } from './jira-issues.js';
import { registerJiraProjectsTool } from './jira-projects.js';
import { registerJiraSprintsTool } from './jira-sprints.js';
import { registerJiraBoardsTool } from './jira-boards.js';
import { registerJiraCommentsTool } from './jira-comments.js';
import { registerJiraLinksTool } from './jira-links.js';
import { registerJiraWorklogsTool } from './jira-worklogs.js';
import { registerJiraUsersTool } from './jira-users.js';
import { registerJiraFieldsTool } from './jira-fields.js';
import { registerJiraAuditTool } from './jira-audit.js';

// Re-export tool registration functions
export {
  registerJiraIssuesTool,
  registerJiraProjectsTool,
  registerJiraSprintsTool,
  registerJiraBoardsTool,
  registerJiraCommentsTool,
  registerJiraLinksTool,
  registerJiraWorklogsTool,
  registerJiraUsersTool,
  registerJiraFieldsTool,
  registerJiraAuditTool,
};

// Re-export presets
export * from '../presets.js';

/**
 * Registers all consolidated Jira tools with the MCP server.
 *
 * @param server - The MCP server instance
 */
export function registerAllConsolidatedTools(server: McpServer): void {
  registerJiraIssuesTool(server);
  registerJiraProjectsTool(server);
  registerJiraSprintsTool(server);
  registerJiraBoardsTool(server);
  registerJiraCommentsTool(server);
  registerJiraLinksTool(server);
  registerJiraWorklogsTool(server);
  registerJiraUsersTool(server);
  registerJiraFieldsTool(server);
  registerJiraAuditTool(server);
}
