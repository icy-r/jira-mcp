/**
 * Jira Issues API endpoints.
 * @module jira/endpoints/issues
 */

import { getClient } from '../client.js';
import type {
  JiraIssue,
  JiraTransition,
  JiraUser,
  CreateIssueInput,
  UpdateIssueInput,
  JqlSearchParams,
  JqlSearchResponse,
} from '../types.js';
import { createLogger } from '../../utils/logger.js';
import { resolveUserIdentifier } from './users.js';
import { markdownToAdf } from '../../utils/adf.js';

const logger = createLogger('jira-issues');

/**
 * Gets an issue by key or ID.
 *
 * @param issueIdOrKey - The issue key (e.g., "PROJ-123") or ID
 * @param fields - Optional list of fields to return
 * @param expand - Optional list of expansions
 * @returns The issue data
 *
 * @example
 * const issue = await getIssue('PROJ-123', ['summary', 'status']);
 */
export async function getIssue(
  issueIdOrKey: string,
  fields?: string[],
  expand?: string[]
): Promise<JiraIssue> {
  logger.debug('Getting issue', { issueIdOrKey });

  const params: Record<string, string | undefined> = {};
  if (fields?.length) {
    params['fields'] = fields.join(',');
  }
  if (expand?.length) {
    params['expand'] = expand.join(',');
  }

  return getClient().get<JiraIssue>(`/rest/api/3/issue/${issueIdOrKey}`, {
    params,
  });
}

/**
 * Creates a new issue.
 *
 * @param input - Issue creation parameters
 * @returns The created issue
 *
 * @example
 * const issue = await createIssue({
 *   projectKey: 'PROJ',
 *   summary: 'New feature request',
 *   issueType: 'Story',
 *   description: 'Detailed description...'
 * });
 */
export async function createIssue(input: CreateIssueInput): Promise<JiraIssue> {
  logger.debug('Creating issue', { projectKey: input.projectKey });

  const body: Record<string, unknown> = {
    fields: {
      project: { key: input.projectKey },
      summary: input.summary,
      issuetype: { name: input.issueType },
    },
  };

  const fields = body['fields'] as Record<string, unknown>;

  if (input.description) {
    // Convert markdown to ADF for proper formatting
    fields['description'] = markdownToAdf(input.description);
  }

  if (input.priority) {
    fields['priority'] = { name: input.priority };
  }

  if (input.assignee) {
    // Resolve assignee by email, name, or account ID
    const accountId = await resolveUserIdentifier(input.assignee);
    fields['assignee'] = { accountId };
  }

  if (input.labels?.length) {
    fields['labels'] = input.labels;
  }

  if (input.components?.length) {
    fields['components'] = input.components.map((name) => ({ name }));
  }

  if (input.parentKey) {
    fields['parent'] = { key: input.parentKey };
  }

  if (input.customFields) {
    Object.assign(fields, input.customFields);
  }

  const response = await getClient().post<{
    id: string;
    key: string;
    self: string;
  }>('/rest/api/3/issue', { body });

  // Fetch the full issue data
  return getIssue(response.key);
}

/**
 * Updates an existing issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param input - Fields to update
 *
 * @example
 * await updateIssue('PROJ-123', {
 *   summary: 'Updated summary',
 *   priority: 'High'
 * });
 */
export async function updateIssue(
  issueIdOrKey: string,
  input: UpdateIssueInput
): Promise<void> {
  logger.debug('Updating issue', { issueIdOrKey });

  const fields: Record<string, unknown> = {};

  if (input.summary !== undefined) {
    fields['summary'] = input.summary;
  }

  if (input.description !== undefined) {
    // Convert markdown to ADF for proper formatting
    fields['description'] = input.description
      ? markdownToAdf(input.description)
      : null;
  }

  if (input.priority !== undefined) {
    fields['priority'] = { name: input.priority };
  }

  if (input.assignee !== undefined) {
    if (input.assignee) {
      // Resolve assignee by email, name, or account ID
      const accountId = await resolveUserIdentifier(input.assignee);
      fields['assignee'] = { accountId };
    } else {
      fields['assignee'] = null;
    }
  }

  if (input.labels !== undefined) {
    fields['labels'] = input.labels;
  }

  if (input.components !== undefined) {
    fields['components'] = input.components.map((name) => ({ name }));
  }

  if (input.customFields) {
    Object.assign(fields, input.customFields);
  }

  await getClient().put(`/rest/api/3/issue/${issueIdOrKey}`, {
    body: { fields },
  });
}

/**
 * Deletes an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param deleteSubtasks - Whether to delete subtasks
 *
 * @example
 * await deleteIssue('PROJ-123', true);
 */
export async function deleteIssue(
  issueIdOrKey: string,
  deleteSubtasks: boolean = false
): Promise<void> {
  logger.debug('Deleting issue', { issueIdOrKey, deleteSubtasks });

  await getClient().delete(`/rest/api/3/issue/${issueIdOrKey}`, {
    params: { deleteSubtasks },
  });
}

/**
 * Gets available transitions for an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @returns Available transitions
 */
export async function getTransitions(
  issueIdOrKey: string
): Promise<JiraTransition[]> {
  logger.debug('Getting transitions', { issueIdOrKey });

  const response = await getClient().get<{ transitions: JiraTransition[] }>(
    `/rest/api/3/issue/${issueIdOrKey}/transitions`
  );

  return response.transitions;
}

/**
 * Transitions an issue to a new status.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param transitionId - The transition ID
 * @param comment - Optional comment to add
 *
 * @example
 * await transitionIssue('PROJ-123', '21', 'Moving to In Progress');
 */
export async function transitionIssue(
  issueIdOrKey: string,
  transitionId: string,
  comment?: string
): Promise<void> {
  logger.debug('Transitioning issue', { issueIdOrKey, transitionId });

  const body: Record<string, unknown> = {
    transition: { id: transitionId },
  };

  if (comment) {
    // Convert markdown to ADF for proper formatting
    body['update'] = {
      comment: [
        {
          add: {
            body: markdownToAdf(comment),
          },
        },
      ],
    };
  }

  await getClient().post(`/rest/api/3/issue/${issueIdOrKey}/transitions`, {
    body,
  });
}

/**
 * Assigns an issue to a user.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param userIdentifier - The user's account ID, email, or display name (null to unassign)
 */
export async function assignIssue(
  issueIdOrKey: string,
  userIdentifier: string | null
): Promise<void> {
  logger.debug('Assigning issue', { issueIdOrKey, userIdentifier });

  let accountId: string | null = null;
  if (userIdentifier) {
    accountId = await resolveUserIdentifier(userIdentifier);
  }

  await getClient().put(`/rest/api/3/issue/${issueIdOrKey}/assignee`, {
    body: { accountId },
  });
}

/**
 * Links an issue to an epic (parent).
 * Note: Epic Link custom field was deprecated Sept 2025, use parent field instead.
 *
 * @param issueIdOrKey - The issue key or ID to link
 * @param epicKey - The epic's issue key (or null to unlink)
 */
export async function linkToEpic(
  issueIdOrKey: string,
  epicKey: string | null
): Promise<void> {
  logger.debug('Linking issue to epic', { issueIdOrKey, epicKey });

  await getClient().put(`/rest/api/3/issue/${issueIdOrKey}`, {
    body: {
      fields: {
        parent: epicKey ? { key: epicKey } : null,
      },
    },
  });
}

/**
 * Gets the changelog for an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param startAt - Starting index for pagination
 * @param maxResults - Maximum results to return
 * @returns Changelog entries
 */
export async function getChangelog(
  issueIdOrKey: string,
  startAt: number = 0,
  maxResults: number = 100
): Promise<{
  startAt: number;
  maxResults: number;
  total: number;
  values: Array<{
    id: string;
    author: JiraUser;
    created: string;
    items: Array<{
      field: string;
      fieldtype: string;
      from: string | null;
      fromString: string | null;
      to: string | null;
      toString: string | null;
    }>;
  }>;
}> {
  logger.debug('Getting changelog', { issueIdOrKey });

  return getClient().get(`/rest/api/3/issue/${issueIdOrKey}/changelog`, {
    params: { startAt, maxResults },
  });
}

/**
 * Default minimal fields for LLM efficiency.
 * These fields provide enough context without overwhelming token usage.
 */
export const MINIMAL_ISSUE_FIELDS = [
  'summary',
  'status',
  'assignee',
  'priority',
  'issuetype',
  'updated',
  'parent',
];

/**
 * Full fields for detailed issue retrieval.
 */
export const FULL_ISSUE_FIELDS = ['*all'];

/**
 * Searches for issues using JQL.
 * Uses the new /rest/api/3/search/jql endpoint (May 2025 migration).
 *
 * @param params - Search parameters
 * @returns Search results with pagination token
 *
 * @example
 * const results = await searchIssues({
 *   jql: 'project = PROJ AND status = "In Progress"',
 *   maxResults: 50
 * });
 */
export async function searchIssues(
  params: JqlSearchParams
): Promise<JqlSearchResponse> {
  logger.debug('Searching issues', { jql: params.jql });

  const queryParams: Record<string, string | number | undefined> = {
    jql: params.jql,
    maxResults: params.maxResults ?? 50,
    fields: (params.fields ?? MINIMAL_ISSUE_FIELDS).join(','),
  };

  if (params.expand?.length) {
    queryParams['expand'] = params.expand.join(',');
  }

  if (params.nextPageToken) {
    queryParams['nextPageToken'] = params.nextPageToken;
  }

  return getClient().get<JqlSearchResponse>('/rest/api/3/search/jql', {
    params: queryParams,
  });
}

/**
 * Searches all issues matching JQL, handling pagination automatically.
 * Yields issues one by one for memory efficiency.
 *
 * @param jql - The JQL query
 * @param fields - Fields to retrieve (defaults to minimal)
 * @param maxTotal - Maximum total issues to retrieve (default: 1000)
 */
export async function* searchAllIssues(
  jql: string,
  fields?: string[],
  maxTotal: number = 1000
): AsyncGenerator<JiraIssue> {
  let nextPageToken: string | undefined;
  let count = 0;

  do {
    const response = await searchIssues({
      jql,
      fields,
      maxResults: Math.min(100, maxTotal - count),
      nextPageToken,
    });

    for (const issue of response.issues) {
      yield issue;
      count++;
      if (count >= maxTotal) return;
    }

    nextPageToken = response.nextPageToken;
  } while (nextPageToken && count < maxTotal);
}

/**
 * Gets all issues for a specific project.
 *
 * @param projectKey - The project key (e.g., "PROJ")
 * @param _startAt - Starting index for pagination (reserved for future use)
 * @param maxResults - Maximum results to return
 * @param fields - Optional fields to return
 * @returns Search results with pagination
 */
export async function getProjectIssues(
  projectKey: string,
  _startAt: number = 0,
  maxResults: number = 50,
  fields?: string[]
): Promise<JqlSearchResponse> {
  logger.debug('Getting project issues', { projectKey });

  const jql = `project = "${projectKey}" ORDER BY updated DESC`;
  return searchIssues({
    jql,
    maxResults,
    fields: fields ?? MINIMAL_ISSUE_FIELDS,
  });
}

/**
 * Input for batch issue creation.
 */
export interface BatchCreateIssueInput {
  projectKey: string;
  summary: string;
  issueType: string;
  description?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  components?: string[];
  parentKey?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Creates multiple issues in a batch.
 *
 * @param issues - Array of issue creation inputs
 * @param validateOnly - If true, only validates without creating
 * @returns Array of created issues (or empty if validateOnly)
 */
export async function batchCreateIssues(
  issues: BatchCreateIssueInput[],
  validateOnly: boolean = false
): Promise<JiraIssue[]> {
  logger.debug('Batch creating issues', { count: issues.length, validateOnly });

  if (issues.length === 0) {
    return [];
  }

  // Build issue updates with resolved assignees
  const issueUpdates: Array<{ fields: Record<string, unknown> }> = [];

  for (const input of issues) {
    const fields: Record<string, unknown> = {
      project: { key: input.projectKey },
      summary: input.summary,
      issuetype: { name: input.issueType },
    };

    if (input.description) {
      // Convert markdown to ADF for proper formatting
      fields['description'] = markdownToAdf(input.description);
    }

    if (input.priority) {
      fields['priority'] = { name: input.priority };
    }

    if (input.assignee) {
      // Resolve assignee by email, name, or account ID
      const accountId = await resolveUserIdentifier(input.assignee);
      fields['assignee'] = { accountId };
    }

    if (input.labels?.length) {
      fields['labels'] = input.labels;
    }

    if (input.components?.length) {
      fields['components'] = input.components.map((name) => ({ name }));
    }

    if (input.parentKey) {
      fields['parent'] = { key: input.parentKey };
    }

    if (input.customFields) {
      Object.assign(fields, input.customFields);
    }

    issueUpdates.push({ fields });
  }

  if (validateOnly) {
    logger.info('Validation only - not creating issues');
    return [];
  }

  const response = await getClient().post<{
    issues: Array<{ id: string; key: string; self: string }>;
    errors: Array<{ status: number; elementErrors: Record<string, unknown> }>;
  }>('/rest/api/3/issue/bulk', { body: { issueUpdates } });

  // Log any errors
  if (response.errors?.length) {
    for (const err of response.errors) {
      logger.error('Batch creation error', err as unknown as Error);
    }
  }

  // Fetch full issue data for created issues
  const createdIssues: JiraIssue[] = [];
  for (const issueInfo of response.issues || []) {
    if (issueInfo.key) {
      try {
        const issue = await getIssue(issueInfo.key);
        createdIssues.push(issue);
      } catch (fetchErr) {
        logger.error(
          `Failed to fetch created issue ${issueInfo.key}`,
          fetchErr as Error
        );
      }
    }
  }

  return createdIssues;
}

/**
 * Changelog item from bulk fetch.
 */
export interface ChangelogItem {
  field: string;
  fieldtype: string;
  from: string | null;
  fromString: string | null;
  to: string | null;
  toString: string | null;
}

/**
 * Changelog entry from bulk fetch.
 */
export interface ChangelogEntry {
  id: string;
  author: JiraUser;
  created: string;
  items: ChangelogItem[];
}

/**
 * Issue with changelogs from bulk fetch.
 */
export interface IssueChangelog {
  issueId: string;
  changelogs: ChangelogEntry[];
}

/**
 * Gets changelogs for multiple issues in a batch (Cloud only).
 *
 * @param issueIdsOrKeys - Array of issue IDs or keys
 * @param fieldIds - Optional array of field IDs to filter changelogs
 * @returns Array of issues with their changelogs
 */
export async function batchGetChangelogs(
  issueIdsOrKeys: string[],
  fieldIds?: string[]
): Promise<IssueChangelog[]> {
  logger.debug('Batch getting changelogs', { count: issueIdsOrKeys.length });

  const results: IssueChangelog[] = [];
  let startAt = 0;
  const maxResults = 100;

  // Fetch all pages
  while (true) {
    const response = await getClient().post<{
      startAt: number;
      maxResults: number;
      total: number;
      isLast: boolean;
      issueChangeLogs: Array<{
        issueId: string;
        changeHistories: ChangelogEntry[];
      }>;
    }>('/rest/api/3/changelog/bulkfetch', {
      body: {
        issueIdsOrKeys,
        fieldIds: fieldIds || null,
      },
      params: { startAt, maxResults },
    });

    for (const item of response.issueChangeLogs || []) {
      // Find existing entry or create new one
      let existing = results.find((r) => r.issueId === item.issueId);
      if (!existing) {
        existing = { issueId: item.issueId, changelogs: [] };
        results.push(existing);
      }
      existing.changelogs.push(...(item.changeHistories || []));
    }

    if (response.isLast) {
      break;
    }
    startAt += maxResults;
  }

  return results;
}
