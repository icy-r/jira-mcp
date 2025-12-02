/**
 * Jira Issue Links API endpoints.
 * @module jira/endpoints/links
 */

import { getClient } from '../client.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('jira-links');

/**
 * Issue link type representation.
 */
export interface IssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self: string;
}

/**
 * Issue link representation.
 */
export interface IssueLink {
  id: string;
  self: string;
  type: IssueLinkType;
  inwardIssue?: {
    id: string;
    key: string;
    self: string;
    fields?: {
      summary: string;
      status: { name: string };
      issuetype: { name: string };
    };
  };
  outwardIssue?: {
    id: string;
    key: string;
    self: string;
    fields?: {
      summary: string;
      status: { name: string };
      issuetype: { name: string };
    };
  };
}

/**
 * Remote link representation.
 */
export interface RemoteLink {
  id: number;
  self: string;
  globalId?: string;
  application?: {
    type: string;
    name: string;
  };
  relationship?: string;
  object: {
    url: string;
    title: string;
    summary?: string;
    icon?: {
      url16x16?: string;
      title?: string;
    };
    status?: {
      resolved: boolean;
      icon?: {
        url16x16?: string;
        title?: string;
      };
    };
  };
}

/**
 * Gets all available issue link types.
 *
 * @returns List of link types
 *
 * @example
 * const types = await getLinkTypes();
 * // Returns: [{ name: 'Blocks', inward: 'is blocked by', outward: 'blocks' }, ...]
 */
export async function getLinkTypes(): Promise<IssueLinkType[]> {
  logger.debug('Getting link types');

  const response = await getClient().get<{ issueLinkTypes: IssueLinkType[] }>(
    '/rest/api/3/issueLinkType'
  );

  return response.issueLinkTypes;
}

/**
 * Creates a link between two issues.
 *
 * @param outwardIssueKey - The issue that is the source of the link
 * @param inwardIssueKey - The issue that is the target of the link
 * @param linkTypeName - The name of the link type (e.g., 'Blocks', 'Relates')
 * @param comment - Optional comment to add
 *
 * @example
 * await createIssueLink('PROJ-1', 'PROJ-2', 'Blocks', 'PROJ-1 blocks PROJ-2');
 */
export async function createIssueLink(
  outwardIssueKey: string,
  inwardIssueKey: string,
  linkTypeName: string,
  comment?: string
): Promise<void> {
  logger.debug('Creating issue link', {
    outwardIssueKey,
    inwardIssueKey,
    linkTypeName,
  });

  const body: Record<string, unknown> = {
    type: { name: linkTypeName },
    inwardIssue: { key: inwardIssueKey },
    outwardIssue: { key: outwardIssueKey },
  };

  if (comment) {
    body['comment'] = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: comment }],
          },
        ],
      },
    };
  }

  await getClient().post('/rest/api/3/issueLink', { body });
}

/**
 * Removes an issue link.
 *
 * @param linkId - The ID of the link to remove
 *
 * @example
 * await removeIssueLink('10001');
 */
export async function removeIssueLink(linkId: string): Promise<void> {
  logger.debug('Removing issue link', { linkId });

  await getClient().delete(`/rest/api/3/issueLink/${linkId}`);
}

/**
 * Gets all links for an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @returns List of issue links
 */
export async function getIssueLinks(
  issueIdOrKey: string
): Promise<IssueLink[]> {
  logger.debug('Getting issue links', { issueIdOrKey });

  const response = await getClient().get<{
    fields: { issuelinks?: IssueLink[] };
  }>(`/rest/api/3/issue/${issueIdOrKey}`, {
    params: { fields: 'issuelinks' },
  });

  return response.fields.issuelinks ?? [];
}

/**
 * Gets remote links for an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @returns List of remote links
 */
export async function getRemoteLinks(
  issueIdOrKey: string
): Promise<RemoteLink[]> {
  logger.debug('Getting remote links', { issueIdOrKey });

  return getClient().get<RemoteLink[]>(
    `/rest/api/3/issue/${issueIdOrKey}/remotelink`
  );
}

/**
 * Creates a remote link (web link or Confluence link) for an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param url - The URL of the remote link
 * @param title - The title of the link
 * @param summary - Optional summary/description
 * @param iconUrl - Optional icon URL
 * @returns The created remote link
 *
 * @example
 * await createRemoteLink('PROJ-123', 'https://example.com/doc', 'Documentation');
 */
export async function createRemoteLink(
  issueIdOrKey: string,
  url: string,
  title: string,
  summary?: string,
  iconUrl?: string
): Promise<RemoteLink> {
  logger.debug('Creating remote link', { issueIdOrKey, url, title });

  const body: Record<string, unknown> = {
    object: {
      url,
      title,
      summary,
      icon: iconUrl ? { url16x16: iconUrl } : undefined,
    },
  };

  return getClient().post<RemoteLink>(
    `/rest/api/3/issue/${issueIdOrKey}/remotelink`,
    { body }
  );
}

/**
 * Removes a remote link from an issue.
 *
 * @param issueIdOrKey - The issue key or ID
 * @param remoteLinkId - The ID of the remote link
 */
export async function removeRemoteLink(
  issueIdOrKey: string,
  remoteLinkId: number
): Promise<void> {
  logger.debug('Removing remote link', { issueIdOrKey, remoteLinkId });

  await getClient().delete(
    `/rest/api/3/issue/${issueIdOrKey}/remotelink/${remoteLinkId}`
  );
}
