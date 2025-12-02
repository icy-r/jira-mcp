/**
 * TOON format integration for optimized MCP responses.
 * TOON reduces token usage by 30-60% compared to JSON.
 * @module formatters/toon
 */

import { encode } from '@toon-format/toon';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('toon-formatter');

/**
 * TOON encoding options.
 */
export interface ToonOptions {
  /** Key folding mode */
  keyFolding?: 'off' | 'safe';
  /** Delimiter for array values */
  delimiter?: ',' | '\t';
  /** Maximum depth for flattening */
  flattenDepth?: number;
}

/**
 * Default TOON options.
 */
const DEFAULT_OPTIONS: ToonOptions = {
  keyFolding: 'safe',
  delimiter: ',',
  flattenDepth: Infinity,
};

/**
 * Encodes data to TOON format.
 *
 * @param data - Data to encode
 * @param options - Encoding options
 * @returns TOON-formatted string
 *
 * @example
 * const issues = [
 *   { key: 'PROJ-1', summary: 'Bug fix', status: 'Open' },
 *   { key: 'PROJ-2', summary: 'Feature', status: 'Done' }
 * ];
 * const toon = encodeToon({ issues });
 * // issues[2]{key,summary,status}:
 * //   PROJ-1,Bug fix,Open
 * //   PROJ-2,Feature,Done
 */
export function encodeToon(data: unknown, options?: ToonOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    return encode(data, {
      keyFolding: opts.keyFolding,
      delimiter: opts.delimiter,
      flattenDepth: opts.flattenDepth,
    });
  } catch (error) {
    logger.warn('Failed to encode as TOON, falling back to JSON', {
      error: (error as Error).message,
    });
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Formats data for MCP response, optionally using TOON.
 *
 * @param data - Data to format
 * @param useToon - Whether to use TOON format
 * @param options - TOON options
 * @returns Formatted string
 */
export function formatResponse(
  data: unknown,
  useToon: boolean = true,
  options?: ToonOptions
): string {
  if (useToon) {
    return encodeToon(data, options);
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Simplifies Jira issue data for optimal TOON encoding.
 * Extracts only the most relevant fields.
 */
export function simplifyIssue(issue: {
  key: string;
  fields: {
    summary: string;
    status?: { name: string };
    priority?: { name: string };
    assignee?: { displayName: string } | null;
    issuetype?: { name: string };
    created?: string;
    updated?: string;
  };
}): Record<string, unknown> {
  return {
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status?.name,
    priority: issue.fields.priority?.name,
    assignee: issue.fields.assignee?.displayName ?? 'Unassigned',
    type: issue.fields.issuetype?.name,
    created: issue.fields.created?.split('T')[0],
    updated: issue.fields.updated?.split('T')[0],
  };
}

/**
 * Simplifies an array of issues for TOON encoding.
 */
export function simplifyIssues(
  issues: Array<{
    key: string;
    fields: {
      summary: string;
      status?: { name: string };
      priority?: { name: string };
      assignee?: { displayName: string } | null;
      issuetype?: { name: string };
      created?: string;
      updated?: string;
    };
  }>
): Record<string, unknown>[] {
  return issues.map(simplifyIssue);
}

/**
 * Simplifies project data for TOON encoding.
 */
export function simplifyProject(project: {
  key: string;
  name: string;
  description?: string;
  lead?: { displayName: string };
  projectTypeKey?: string;
}): Record<string, unknown> {
  return {
    key: project.key,
    name: project.name,
    description: project.description,
    lead: project.lead?.displayName,
    type: project.projectTypeKey,
  };
}

/**
 * Simplifies sprint data for TOON encoding.
 */
export function simplifySprint(sprint: {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}): Record<string, unknown> {
  return {
    id: sprint.id,
    name: sprint.name,
    state: sprint.state,
    start: sprint.startDate?.split('T')[0],
    end: sprint.endDate?.split('T')[0],
    goal: sprint.goal,
  };
}

/**
 * Simplifies user data for TOON encoding.
 */
export function simplifyUser(user: {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
}): Record<string, unknown> {
  return {
    id: user.accountId,
    name: user.displayName,
    email: user.emailAddress,
    active: user.active,
  };
}

/**
 * Simplifies comment data for TOON encoding.
 */
export function simplifyComment(comment: {
  id: string;
  author: { displayName: string };
  body: unknown;
  created: string;
  updated: string;
}): Record<string, unknown> {
  // Extract text from ADF body if needed
  let bodyText = '';
  if (typeof comment.body === 'string') {
    bodyText = comment.body;
  } else if (
    typeof comment.body === 'object' &&
    comment.body !== null &&
    'content' in comment.body
  ) {
    bodyText = extractTextFromAdf(comment.body);
  }

  return {
    id: comment.id,
    author: comment.author.displayName,
    body: bodyText.substring(0, 200), // Truncate long comments
    created: comment.created.split('T')[0],
  };
}

/**
 * Extracts plain text from Atlassian Document Format (ADF).
 */
function extractTextFromAdf(adf: unknown): string {
  if (typeof adf !== 'object' || adf === null) {
    return '';
  }

  const doc = adf as { content?: unknown[] };
  if (!Array.isArray(doc.content)) {
    return '';
  }

  const texts: string[] = [];

  function traverse(nodes: unknown[]): void {
    for (const node of nodes) {
      if (typeof node !== 'object' || node === null) continue;

      const n = node as { type?: string; text?: string; content?: unknown[] };

      if (n.type === 'text' && typeof n.text === 'string') {
        texts.push(n.text);
      }

      if (Array.isArray(n.content)) {
        traverse(n.content);
      }
    }
  }

  traverse(doc.content);
  return texts.join(' ');
}

/**
 * Simplifies board data for TOON encoding.
 */
export function simplifyBoard(board: {
  id: number;
  name: string;
  type: string;
  location?: { projectKey?: string };
}): Record<string, unknown> {
  return {
    id: board.id,
    name: board.name,
    type: board.type,
    project: board.location?.projectKey,
  };
}

/**
 * Simplifies version data for TOON encoding.
 */
export function simplifyVersion(version: {
  id: string;
  name: string;
  released: boolean;
  releaseDate?: string;
}): Record<string, unknown> {
  return {
    id: version.id,
    name: version.name,
    released: version.released,
    releaseDate: version.releaseDate,
  };
}

/**
 * Simplifies link data for TOON encoding.
 */
export function simplifyLink(link: {
  id: string;
  type: { name: string };
  inwardIssue?: { key: string; fields?: { summary: string } };
  outwardIssue?: { key: string; fields?: { summary: string } };
}): Record<string, unknown> {
  return {
    id: link.id,
    type: link.type.name,
    direction: link.inwardIssue ? 'inward' : 'outward',
    linkedIssue: link.inwardIssue?.key || link.outwardIssue?.key,
    linkedSummary:
      link.inwardIssue?.fields?.summary || link.outwardIssue?.fields?.summary,
  };
}

/**
 * Simplifies worklog data for TOON encoding.
 */
export function simplifyWorklog(worklog: {
  id: string;
  author: { displayName: string };
  timeSpent: string;
  started: string;
  comment?: unknown;
}): Record<string, unknown> {
  let commentText = '';
  if (worklog.comment) {
    if (typeof worklog.comment === 'string') {
      commentText = worklog.comment;
    } else {
      commentText = extractTextFromAdf(worklog.comment);
    }
  }

  return {
    id: worklog.id,
    author: worklog.author.displayName,
    timeSpent: worklog.timeSpent,
    started: worklog.started.split('T')[0],
    comment: commentText.substring(0, 100),
  };
}

/**
 * Simplifies changelog entry for TOON encoding.
 */
export function simplifyChangelog(entry: {
  id: string;
  author: { displayName: string };
  created: string;
  items: Array<{
    field: string;
    fromString: string | null;
    toString: string | null;
  }>;
}): Record<string, unknown> {
  return {
    id: entry.id,
    author: entry.author.displayName,
    created: entry.created.split('T')[0],
    changes: entry.items.map((item) => ({
      field: item.field,
      from: item.fromString,
      to: item.toString,
    })),
  };
}
