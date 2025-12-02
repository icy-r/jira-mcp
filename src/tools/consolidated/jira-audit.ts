/**
 * Jira Audit Tool.
 * Provides audit log viewing and safety configuration.
 * @module tools/consolidated/jira-audit
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  setDryRunMode,
  isDryRunMode,
  configureAudit,
  getSessionLog,
  getRecentAuditEntries,
  formatAuditLog,
  clearSessionLog,
} from '../../utils/audit.js';
import { encodeToon } from '../../formatters/toon.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('tool-jira-audit');

/**
 * Schema for the jira_audit tool.
 */
const jiraAuditSchema = z.object({
  action: z
    .enum([
      'get_status',
      'set_dry_run',
      'get_session_log',
      'get_recent_log',
      'clear_session',
      'configure',
    ])
    .describe('The action to perform'),

  // set_dry_run
  enabled: z
    .boolean()
    .optional()
    .describe('Enable or disable dry-run mode (for set_dry_run)'),

  // get_recent_log
  count: z
    .number()
    .optional()
    .default(50)
    .describe('Number of entries to retrieve (for get_recent_log)'),

  // configure
  requireConfirmation: z
    .boolean()
    .optional()
    .describe('Require confirmation for destructive actions'),
  logToFile: z.boolean().optional().describe('Enable logging to file'),
  logToConsole: z.boolean().optional().describe('Enable logging to console'),
});

type JiraAuditInput = z.infer<typeof jiraAuditSchema>;

/**
 * Handler for the jira_audit tool.
 */
async function handleJiraAudit(input: JiraAuditInput): Promise<string> {
  const { action } = input;

  switch (action) {
    case 'get_status': {
      return encodeToon({
        dryRunMode: isDryRunMode(),
        sessionLogCount: getSessionLog().length,
        hint: 'Use set_dry_run to enable/disable dry-run mode. Use get_session_log to view changes made in this session.',
      });
    }

    case 'set_dry_run': {
      if (input.enabled === undefined) {
        throw new Error('enabled is required for set_dry_run action');
      }

      setDryRunMode(input.enabled);
      return encodeToon({
        success: true,
        dryRunMode: input.enabled,
        message: input.enabled
          ? 'Dry-run mode enabled. No changes will be made to Jira.'
          : 'Dry-run mode disabled. Changes will be applied to Jira.',
      });
    }

    case 'get_session_log': {
      const entries = getSessionLog();
      if (entries.length === 0) {
        return encodeToon({
          message: 'No changes have been made in this session.',
          entries: [],
        });
      }

      return formatAuditLog(entries);
    }

    case 'get_recent_log': {
      const entries = getRecentAuditEntries(input.count ?? 50);
      if (entries.length === 0) {
        return encodeToon({
          message: 'No audit entries found in the log file.',
          entries: [],
        });
      }

      return formatAuditLog(entries);
    }

    case 'clear_session': {
      clearSessionLog();
      return encodeToon({
        success: true,
        message: 'Session audit log cleared.',
      });
    }

    case 'configure': {
      const config: Record<string, unknown> = {};

      if (input.requireConfirmation !== undefined) {
        config['requireConfirmation'] = input.requireConfirmation;
      }
      if (input.logToFile !== undefined) {
        config['logToFile'] = input.logToFile;
      }
      if (input.logToConsole !== undefined) {
        config['logToConsole'] = input.logToConsole;
      }

      if (Object.keys(config).length === 0) {
        throw new Error(
          'At least one configuration option must be provided for configure action'
        );
      }

      configureAudit(config);
      return encodeToon({
        success: true,
        message: 'Audit configuration updated.',
        config,
      });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_audit tool with the MCP server.
 */
export function registerJiraAuditTool(server: McpServer): void {
  server.tool(
    'jira_audit',
    `Manage audit logging and safety features. Actions:
- get_status: Check current dry-run mode and session stats
- set_dry_run: Enable/disable dry-run mode (preview changes without executing)
- get_session_log: View all changes made in this session
- get_recent_log: View recent entries from the audit log file
- clear_session: Clear the session audit log
- configure: Update audit settings (requireConfirmation, logToFile, logToConsole)

Dry-run mode: When enabled, all create/update/delete operations will show what WOULD happen without making actual changes.`,
    jiraAuditSchema.shape,
    async (params) => {
      try {
        const input = jiraAuditSchema.parse(params);
        const result = await handleJiraAudit(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_audit error',
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
