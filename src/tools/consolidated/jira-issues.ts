/**
 * Consolidated Jira Issues Tool.
 * Combines all issue-related operations into a single action-based tool.
 * @module tools/consolidated/jira-issues
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  searchIssues,
  transitionIssue,
  assignIssue,
  getTransitions,
  linkToEpic,
  getChangelog,
  getProjectIssues,
  batchCreateIssues,
  batchGetChangelogs,
  MINIMAL_ISSUE_FIELDS,
  FULL_ISSUE_FIELDS,
  type BatchCreateIssueInput,
} from '../../jira/endpoints/issues.js';
import { getClient } from '../../jira/client.js';
import { buildSearchJql, type SearchPreset } from '../presets.js';
import { encodeToon, simplifyIssues } from '../../formatters/toon.js';
import { adfToMarkdown, isAdfDocument } from '../../utils/adf.js';
import { createLogger } from '../../utils/logger.js';
import {
  logAudit,
  isDryRunMode,
  validateConfirmation,
  createDryRunSummary,
  type AuditAction,
} from '../../utils/audit.js';
import type { JiraIssue } from '../../jira/types.js';

const logger = createLogger('tool-jira-issues');

/**
 * Schema for the jira_issues tool.
 */
const jiraIssuesSchema = z.object({
  action: z
    .enum([
      'get',
      'create',
      'update',
      'delete',
      'search',
      'transition',
      'assign',
      'get_transitions',
      'link_to_epic',
      'get_changelog',
      'get_project_issues',
      'batch_create',
      'batch_get_changelogs',
    ])
    .describe('The action to perform'),

  // Common fields
  issueKey: z
    .string()
    .optional()
    .describe(
      'Issue key (e.g., "PROJ-123") - required for get, update, delete, transition, assign, link_to_epic, get_changelog'
    ),

  // Get options
  full: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Return full issue data instead of minimal fields (default: false)'
    ),
  expand: z
    .string()
    .optional()
    .describe(
      'Fields to expand (e.g., "renderedFields", "transitions", "changelog")'
    ),
  commentLimit: z
    .number()
    .optional()
    .default(10)
    .describe(
      'Maximum number of comments to include (0 for none, default: 10)'
    ),

  // Safety options
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Preview changes without executing (default: false). Recommended for destructive actions.'
    ),
  confirm: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Confirm destructive action (required for update/delete unless dryRun=true)'
    ),

  // Create fields
  projectKey: z.string().optional().describe('Project key for create action'),
  summary: z.string().optional().describe('Issue summary for create/update'),
  issueType: z
    .string()
    .optional()
    .describe('Issue type (e.g., "Bug", "Story", "Task") for create'),
  description: z
    .string()
    .optional()
    .describe('Issue description (supports markdown) for create/update'),
  priority: z.string().optional().describe('Priority name for create/update'),
  assignee: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Assignee identifier (email, display name, or account ID) for create/update/assign (null to unassign). Example: 'user@example.com', 'John Doe', 'accountid:...'"
    ),
  labels: z.array(z.string()).optional().describe('Labels for create/update'),
  components: z
    .array(z.string())
    .optional()
    .describe('Component names for create/update'),
  parentKey: z
    .string()
    .optional()
    .describe('Parent issue key (for subtasks or epic children) for create'),
  customFields: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Custom fields as key-value pairs'),

  // Search fields
  jql: z.string().optional().describe('JQL query for search action'),
  preset: z
    .enum([
      'my_issues',
      'current_sprint',
      'my_sprint_issues',
      'recently_updated',
      'blocked',
      'unassigned_sprint',
      'my_watching',
      'my_reported',
      'high_priority',
      'due_soon',
      'created_today',
      'updated_today',
    ])
    .optional()
    .describe('Preset JQL query for search action'),
  maxResults: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum results for search (default: 50)'),
  nextPageToken: z.string().optional().describe('Pagination token for search'),

  // Transition fields
  transitionId: z
    .string()
    .optional()
    .describe('Transition ID for transition action'),
  transitionName: z
    .string()
    .optional()
    .describe('Transition name (alternative to transitionId)'),
  comment: z.string().optional().describe('Comment to add with transition'),

  // Delete fields
  deleteSubtasks: z
    .boolean()
    .optional()
    .default(false)
    .describe('Delete subtasks when deleting issue'),

  // Epic link fields
  epicKey: z
    .string()
    .nullable()
    .optional()
    .describe('Epic key to link to (null to unlink) for link_to_epic action'),

  // Batch create fields
  issues: z
    .array(
      z.object({
        projectKey: z.string(),
        summary: z.string(),
        issueType: z.string(),
        description: z.string().optional(),
        priority: z.string().optional(),
        assignee: z.string().optional(),
        labels: z.array(z.string()).optional(),
        components: z.array(z.string()).optional(),
        parentKey: z.string().optional(),
        customFields: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .optional()
    .describe('Array of issues for batch_create action'),
  validateOnly: z
    .boolean()
    .optional()
    .default(false)
    .describe('Only validate issues without creating (for batch_create)'),

  // Batch changelog fields
  issueKeys: z
    .array(z.string())
    .optional()
    .describe('Array of issue keys for batch_get_changelogs'),
  fieldIds: z
    .array(z.string())
    .optional()
    .describe('Filter changelogs by field IDs (for batch_get_changelogs)'),

  // Pagination for get_project_issues
  startAt: z
    .number()
    .optional()
    .default(0)
    .describe('Starting index for pagination'),
});

type JiraIssuesInput = z.infer<typeof jiraIssuesSchema>;

/**
 * Maps tool actions to audit actions.
 */
function getAuditAction(action: JiraIssuesInput['action']): AuditAction | null {
  switch (action) {
    case 'create':
    case 'batch_create':
      return 'create';
    case 'update':
      return 'update';
    case 'delete':
      return 'delete';
    case 'transition':
      return 'transition';
    case 'assign':
      return 'assign';
    case 'link_to_epic':
      return 'link';
    default:
      return null; // Read-only operations don't need audit
  }
}

/**
 * Formats issue response in a clean, minimal format optimized for token efficiency.
 * Returns only essential fields in a readable markdown-like format.
 *
 * @param issue - The Jira issue to format
 * @param full - Whether to include description and comments
 * @returns Formatted string representation of the issue
 */
function formatIssueResponse(issue: JiraIssue, full: boolean): string {
  const fields = issue.fields;

  // Extract basic info
  const summary = fields.summary || '';
  const status = fields.status?.name || '';
  const issueType = fields.issuetype?.name || '';
  const priority = fields.priority?.name || '';
  const created = fields.created || '';
  const updated = fields.updated || '';

  // Extract people
  const reporter = fields.reporter?.displayName || '';
  const assignee = fields.assignee?.displayName || '';

  // Extract project
  const projectKey = fields.project?.key || '';
  const projectName = fields.project?.name || '';

  // Extract parent/epic
  const parent = fields.parent as
    | { key: string; fields?: { summary?: string } }
    | undefined;
  const parentInfo = parent
    ? `${parent.key} - ${parent.fields?.summary || ''}`
    : '';

  // Extract labels
  const labels = fields.labels?.join(', ') || '';

  // Extract sprint info (custom field varies by instance)
  const fieldsRecord = fields as Record<string, unknown>;
  const sprint = fieldsRecord['customfield_11840'] as
    | Array<{ name: string; state: string }>
    | undefined;
  const sprintInfo = sprint?.[0]
    ? `${sprint[0].name} (${sprint[0].state})`
    : '';

  // Build minimal response
  const lines: string[] = [];
  lines.push(`# ${issue.key}: ${summary}`);
  lines.push('');
  lines.push(`**Type**: ${issueType}`);
  lines.push(`**Status**: ${status}`);
  if (priority) lines.push(`**Priority**: ${priority}`);
  lines.push(`**Project**: ${projectKey} - ${projectName}`);
  if (parentInfo) lines.push(`**Parent/Epic**: ${parentInfo}`);
  if (reporter) lines.push(`**Reporter**: ${reporter}`);
  if (assignee) lines.push(`**Assignee**: ${assignee}`);
  if (labels) lines.push(`**Labels**: ${labels}`);
  if (sprintInfo) lines.push(`**Sprint**: ${sprintInfo}`);
  lines.push(`**Created**: ${created}`);
  lines.push(`**Updated**: ${updated}`);

  if (full) {
    // Add description
    const description = isAdfDocument(fields.description)
      ? adfToMarkdown(fields.description)
      : (fields.description as string) || '';

    if (description) {
      lines.push('');
      lines.push('## Description');
      lines.push('');
      lines.push(description);
    }

    // Add comments if present
    const comments = fields.comment?.comments || [];
    if (comments.length > 0) {
      lines.push('');
      lines.push('## Comments');
      lines.push('');
      for (const comment of comments.slice(0, 10)) {
        // Limit to 10 comments
        const author = comment.author?.displayName || 'Unknown';
        const commentDate = comment.created || '';
        const body = isAdfDocument(comment.body)
          ? adfToMarkdown(comment.body)
          : (comment.body as string) || '';

        lines.push(`### ${author} - ${commentDate}`);
        lines.push(body);
        lines.push('');
      }
    }

    // Add subtasks if present
    const subtasks = fields.subtasks || [];
    if (subtasks.length > 0) {
      lines.push('');
      lines.push('## Subtasks');
      lines.push('');
      for (const subtask of subtasks) {
        const subtaskStatus = subtask.fields?.status?.name || '';
        lines.push(
          `- [${subtask.key}] ${subtask.fields?.summary || ''} (${subtaskStatus})`
        );
      }
    }

    // Add issue links if present
    const issueLinks = (fieldsRecord['issuelinks'] || []) as Array<{
      type?: { name?: string; outward?: string; inward?: string };
      outwardIssue?: { key: string; fields?: { summary?: string } };
      inwardIssue?: { key: string; fields?: { summary?: string } };
    }>;
    if (issueLinks.length > 0) {
      lines.push('');
      lines.push('## Linked Issues');
      lines.push('');
      for (const link of issueLinks) {
        const linkType = link.type?.name || '';
        const linkedIssue = link.outwardIssue || link.inwardIssue;
        if (linkedIssue) {
          const direction = link.outwardIssue
            ? link.type?.outward
            : link.type?.inward;
          lines.push(
            `- ${direction || linkType}: [${linkedIssue.key}] ${linkedIssue.fields?.summary || ''}`
          );
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * Handler for the jira_issues tool.
 */
async function handleJiraIssues(input: JiraIssuesInput): Promise<string> {
  const { action } = input;
  const auditAction = getAuditAction(action);
  const isDryRun = input.dryRun || isDryRunMode();

  // Check confirmation for destructive actions
  if (auditAction && !isDryRun) {
    const confirmation = validateConfirmation(auditAction, input.confirm);
    if (!confirmation.valid) {
      return encodeToon({
        error: 'Confirmation required',
        message: confirmation.message,
        hint: 'Set confirm: true to proceed, or use dryRun: true to preview changes.',
      });
    }
  }

  switch (action) {
    case 'get': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for get action');
      }

      // Validate project access
      const client = getClient();
      client.validateProjectAccess(input.issueKey);

      const fields = input.full ? FULL_ISSUE_FIELDS : MINIMAL_ISSUE_FIELDS;
      // Add comment field if commentLimit > 0
      const fieldsWithComment =
        (input.commentLimit ?? 10) > 0 && !input.full
          ? [...fields, 'comment']
          : fields;

      const expand = input.expand ? input.expand.split(',') : undefined;
      const issue = await getIssue(input.issueKey, fieldsWithComment, expand);
      return formatIssueResponse(issue, input.full ?? false);
    }

    case 'create': {
      if (!input.projectKey || !input.summary || !input.issueType) {
        throw new Error(
          'projectKey, summary, and issueType are required for create action'
        );
      }

      const createInput = {
        projectKey: input.projectKey,
        summary: input.summary,
        issueType: input.issueType,
        description: input.description,
        priority: input.priority,
        assignee: input.assignee ?? undefined,
        labels: input.labels,
        components: input.components,
        parentKey: input.parentKey,
        customFields: input.customFields,
      };

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'create',
          resource: 'issue',
          input: createInput as Record<string, unknown>,
          result: 'dry-run',
        });
        return createDryRunSummary(
          'create',
          'issue',
          undefined,
          createInput as Record<string, unknown>
        );
      }

      try {
        const issue = await createIssue(createInput);
        logAudit({
          action: 'create',
          resource: 'issue',
          resourceId: issue.key,
          input: createInput as Record<string, unknown>,
          result: 'success',
        });
        return formatIssueResponse(issue, false);
      } catch (err) {
        logAudit({
          action: 'create',
          resource: 'issue',
          input: createInput as Record<string, unknown>,
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    case 'update': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for update action');
      }

      const updateInput = {
        summary: input.summary,
        description: input.description,
        priority: input.priority,
        assignee: input.assignee,
        labels: input.labels,
        components: input.components,
        customFields: input.customFields,
      };

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'update',
          resource: 'issue',
          resourceId: input.issueKey,
          input: updateInput as Record<string, unknown>,
          result: 'dry-run',
        });
        return createDryRunSummary(
          'update',
          'issue',
          input.issueKey,
          updateInput as Record<string, unknown>
        );
      }

      try {
        await updateIssue(input.issueKey, updateInput);
        logAudit({
          action: 'update',
          resource: 'issue',
          resourceId: input.issueKey,
          input: updateInput as Record<string, unknown>,
          result: 'success',
        });
        return encodeToon({
          success: true,
          issueKey: input.issueKey,
          message: 'Issue updated',
        });
      } catch (err) {
        logAudit({
          action: 'update',
          resource: 'issue',
          resourceId: input.issueKey,
          input: updateInput as Record<string, unknown>,
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    case 'delete': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for delete action');
      }

      const deleteInput = {
        issueKey: input.issueKey,
        deleteSubtasks: input.deleteSubtasks ?? false,
      };

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'delete',
          resource: 'issue',
          resourceId: input.issueKey,
          input: deleteInput,
          result: 'dry-run',
        });
        return createDryRunSummary(
          'delete',
          'issue',
          input.issueKey,
          deleteInput
        );
      }

      try {
        await deleteIssue(input.issueKey, input.deleteSubtasks ?? false);
        logAudit({
          action: 'delete',
          resource: 'issue',
          resourceId: input.issueKey,
          input: deleteInput,
          result: 'success',
        });
        return encodeToon({
          success: true,
          issueKey: input.issueKey,
          message: 'Issue deleted',
        });
      } catch (err) {
        logAudit({
          action: 'delete',
          resource: 'issue',
          resourceId: input.issueKey,
          input: deleteInput,
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    case 'search': {
      const jql = buildSearchJql({
        preset: input.preset as SearchPreset | undefined,
        jql: input.jql,
        projectKey: input.projectKey,
      });

      const fields = input.full ? FULL_ISSUE_FIELDS : MINIMAL_ISSUE_FIELDS;
      const response = await searchIssues({
        jql,
        maxResults: input.maxResults ?? 50,
        fields,
        nextPageToken: input.nextPageToken,
      });

      const result = {
        issues: input.full ? response.issues : simplifyIssues(response.issues),
        total: response.total,
        nextPageToken: response.nextPageToken,
      };

      return input.full ? JSON.stringify(result, null, 2) : encodeToon(result);
    }

    case 'transition': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for transition action');
      }

      let transitionId = input.transitionId;

      // If transitionName provided, look up the ID
      if (!transitionId && input.transitionName) {
        const transitions = await getTransitions(input.issueKey);
        const transition = transitions.find(
          (t) => t.name.toLowerCase() === input.transitionName!.toLowerCase()
        );
        if (!transition) {
          const available = transitions.map((t) => t.name).join(', ');
          throw new Error(
            `Transition "${input.transitionName}" not found. Available: ${available}`
          );
        }
        transitionId = transition.id;
      }

      if (!transitionId) {
        throw new Error(
          'transitionId or transitionName is required for transition action'
        );
      }

      const transitionInput = {
        issueKey: input.issueKey,
        transitionId,
        transitionName: input.transitionName,
        comment: input.comment,
      };

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'transition',
          resource: 'issue',
          resourceId: input.issueKey,
          input: transitionInput,
          result: 'dry-run',
        });
        return createDryRunSummary(
          'transition',
          'issue',
          input.issueKey,
          transitionInput
        );
      }

      try {
        await transitionIssue(input.issueKey, transitionId, input.comment);
        logAudit({
          action: 'transition',
          resource: 'issue',
          resourceId: input.issueKey,
          input: transitionInput,
          result: 'success',
        });
        return encodeToon({
          success: true,
          issueKey: input.issueKey,
          message: 'Issue transitioned',
        });
      } catch (err) {
        logAudit({
          action: 'transition',
          resource: 'issue',
          resourceId: input.issueKey,
          input: transitionInput,
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    case 'assign': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for assign action');
      }

      const assignInput = {
        issueKey: input.issueKey,
        assignee: input.assignee ?? null,
      };

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'assign',
          resource: 'issue',
          resourceId: input.issueKey,
          input: assignInput,
          result: 'dry-run',
        });
        return createDryRunSummary(
          'assign',
          'issue',
          input.issueKey,
          assignInput
        );
      }

      try {
        await assignIssue(input.issueKey, input.assignee ?? null);
        logAudit({
          action: 'assign',
          resource: 'issue',
          resourceId: input.issueKey,
          input: assignInput,
          result: 'success',
        });
        return encodeToon({
          success: true,
          issueKey: input.issueKey,
          message: input.assignee ? 'Issue assigned' : 'Issue unassigned',
        });
      } catch (err) {
        logAudit({
          action: 'assign',
          resource: 'issue',
          resourceId: input.issueKey,
          input: assignInput,
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    case 'get_transitions': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for get_transitions action');
      }

      const transitions = await getTransitions(input.issueKey);
      const simplified = transitions.map((t) => ({
        id: t.id,
        name: t.name,
        to: t.to.name,
      }));

      return encodeToon({ transitions: simplified });
    }

    case 'link_to_epic': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for link_to_epic action');
      }

      const linkInput = {
        issueKey: input.issueKey,
        epicKey: input.epicKey ?? null,
      };

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'link',
          resource: 'issue',
          resourceId: input.issueKey,
          input: linkInput,
          result: 'dry-run',
        });
        return createDryRunSummary('link', 'issue', input.issueKey, linkInput);
      }

      try {
        await linkToEpic(input.issueKey, input.epicKey ?? null);
        logAudit({
          action: 'link',
          resource: 'issue',
          resourceId: input.issueKey,
          input: linkInput,
          result: 'success',
        });
        return encodeToon({
          success: true,
          issueKey: input.issueKey,
          message: input.epicKey
            ? `Linked to epic ${input.epicKey}`
            : 'Unlinked from epic',
        });
      } catch (err) {
        logAudit({
          action: 'link',
          resource: 'issue',
          resourceId: input.issueKey,
          input: linkInput,
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    case 'get_changelog': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for get_changelog action');
      }

      const changelog = await getChangelog(
        input.issueKey,
        0,
        input.maxResults ?? 50
      );
      const simplified = changelog.values.map((entry) => ({
        id: entry.id,
        author: entry.author.displayName,
        created: entry.created.split('T')[0],
        changes: entry.items.map((item) => ({
          field: item.field,
          from: item.fromString,
          to: item.toString,
        })),
      }));

      return encodeToon({ changelog: simplified, total: changelog.total });
    }

    case 'get_project_issues': {
      if (!input.projectKey) {
        throw new Error('projectKey is required for get_project_issues action');
      }

      // Validate project access
      const client = getClient();
      const projectsFilter = client.getProjectsFilter();
      if (
        projectsFilter &&
        !projectsFilter.includes(input.projectKey.toUpperCase())
      ) {
        throw new Error(
          `Project '${input.projectKey}' is restricted by configuration`
        );
      }

      const fields = input.full ? FULL_ISSUE_FIELDS : MINIMAL_ISSUE_FIELDS;
      const response = await getProjectIssues(
        input.projectKey,
        input.startAt ?? 0,
        input.maxResults ?? 50,
        fields
      );

      const result = {
        issues: input.full ? response.issues : simplifyIssues(response.issues),
        total: response.total,
        nextPageToken: response.nextPageToken,
      };

      return input.full ? JSON.stringify(result, null, 2) : encodeToon(result);
    }

    case 'batch_create': {
      if (!input.issues?.length) {
        throw new Error('issues array is required for batch_create action');
      }

      const batchInput = input.issues as BatchCreateIssueInput[];

      // Dry-run mode
      if (isDryRun) {
        logAudit({
          action: 'create',
          resource: 'issues',
          input: { count: batchInput.length, validateOnly: input.validateOnly },
          result: 'dry-run',
        });
        return createDryRunSummary('create', 'issues', undefined, {
          count: batchInput.length,
          issues: batchInput.map((i) => ({
            projectKey: i.projectKey,
            summary: i.summary,
            issueType: i.issueType,
          })),
        });
      }

      try {
        const created = await batchCreateIssues(
          batchInput,
          input.validateOnly ?? false
        );

        if (input.validateOnly) {
          return encodeToon({
            success: true,
            message: 'Issues validated successfully',
            count: batchInput.length,
          });
        }

        logAudit({
          action: 'create',
          resource: 'issues',
          input: { count: batchInput.length },
          result: 'success',
        });

        return encodeToon({
          success: true,
          message: `Created ${created.length} issues`,
          issues: simplifyIssues(created),
        });
      } catch (err) {
        logAudit({
          action: 'create',
          resource: 'issues',
          input: { count: batchInput.length },
          result: 'failure',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    case 'batch_get_changelogs': {
      if (!input.issueKeys?.length) {
        throw new Error(
          'issueKeys array is required for batch_get_changelogs action'
        );
      }

      const changelogs = await batchGetChangelogs(
        input.issueKeys,
        input.fieldIds
      );

      const result = changelogs.map((item) => ({
        issueId: item.issueId,
        changelogs: item.changelogs
          .slice(0, input.maxResults ?? 50)
          .map((entry) => ({
            id: entry.id,
            author: entry.author.displayName,
            created: entry.created.split('T')[0],
            changes: entry.items.map((change) => ({
              field: change.field,
              from: change.fromString,
              to: change.toString,
            })),
          })),
      }));

      return input.full ? JSON.stringify(result, null, 2) : encodeToon(result);
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_issues tool with the MCP server.
 */
export function registerJiraIssuesTool(server: McpServer): void {
  server.tool(
    'jira_issues',
    `Manage Jira issues. Actions:
- get: Get issue details (use full=true for all fields)
- create: Create new issue (use dryRun=true to preview)
- update: Update issue fields (requires confirm=true or dryRun=true)
- delete: Delete issue (requires confirm=true or dryRun=true)
- search: Search with JQL or preset (my_issues, current_sprint, my_sprint_issues, recently_updated, blocked, unassigned_sprint, high_priority, due_soon)
- transition: Change issue status
- assign: Assign/unassign issue
- get_transitions: Get available status transitions
- link_to_epic: Link issue to/from epic
- get_changelog: Get issue history
- get_project_issues: Get all issues for a project
- batch_create: Create multiple issues at once
- batch_get_changelogs: Get changelogs for multiple issues (Cloud only)

Safety: Use dryRun=true to preview changes. Destructive actions require confirm=true.`,
    jiraIssuesSchema.shape,
    async (params) => {
      try {
        const input = jiraIssuesSchema.parse(params);
        const result = await handleJiraIssues(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_issues error',
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
