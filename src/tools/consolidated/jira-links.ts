/**
 * Consolidated Jira Links Tool.
 * Combines all issue linking operations into a single action-based tool.
 * @module tools/consolidated/jira-links
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getLinkTypes,
  createIssueLink,
  removeIssueLink,
  getIssueLinks,
  getRemoteLinks,
  createRemoteLink,
  removeRemoteLink,
} from '../../jira/endpoints/links.js';
import { linkToEpic } from '../../jira/endpoints/issues.js';
import { encodeToon } from '../../formatters/toon.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('tool-jira-links');

/**
 * Schema for the jira_links tool.
 */
const jiraLinksSchema = z.object({
  action: z
    .enum([
      'get_link_types',
      'list',
      'create',
      'remove',
      'link_to_epic',
      'list_remote',
      'create_remote',
      'remove_remote',
    ])
    .describe('The action to perform'),

  // Issue identification
  issueKey: z
    .string()
    .optional()
    .describe(
      'Issue key - required for list, create, link_to_epic, remote link operations'
    ),

  // Link identification
  linkId: z.string().optional().describe('Link ID for remove action'),
  remoteLinkId: z
    .number()
    .optional()
    .describe('Remote link ID for remove_remote action'),

  // Create link fields
  targetIssueKey: z
    .string()
    .optional()
    .describe('Target issue key for create action'),
  linkType: z
    .string()
    .optional()
    .describe(
      'Link type name (e.g., "Blocks", "Relates", "Duplicates") for create'
    ),
  comment: z.string().optional().describe('Comment to add with the link'),

  // Epic link fields
  epicKey: z
    .string()
    .nullable()
    .optional()
    .describe('Epic key to link to (null to unlink) for link_to_epic'),

  // Remote link fields
  url: z.string().optional().describe('URL for remote link'),
  title: z.string().optional().describe('Title for remote link'),
  summary: z
    .string()
    .optional()
    .describe('Summary/description for remote link'),
  iconUrl: z.string().optional().describe('Icon URL for remote link'),

  // Get options
  full: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return full data instead of minimal fields'),
});

type JiraLinksInput = z.infer<typeof jiraLinksSchema>;

/**
 * Handler for the jira_links tool.
 */
async function handleJiraLinks(input: JiraLinksInput): Promise<string> {
  const { action } = input;

  switch (action) {
    case 'get_link_types': {
      const types = await getLinkTypes();

      if (input.full) {
        return JSON.stringify(types, null, 2);
      }

      const simplified = types.map((t) => ({
        name: t.name,
        inward: t.inward,
        outward: t.outward,
      }));

      return encodeToon({ linkTypes: simplified });
    }

    case 'list': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for list action');
      }

      const links = await getIssueLinks(input.issueKey);

      if (input.full) {
        return JSON.stringify(links, null, 2);
      }

      const simplified = links.map((link) => ({
        id: link.id,
        type: link.type.name,
        direction: link.inwardIssue ? 'inward' : 'outward',
        linkedIssue: link.inwardIssue?.key || link.outwardIssue?.key,
        linkedSummary:
          link.inwardIssue?.fields?.summary ||
          link.outwardIssue?.fields?.summary,
      }));

      return encodeToon({ links: simplified });
    }

    case 'create': {
      if (!input.issueKey || !input.targetIssueKey || !input.linkType) {
        throw new Error(
          'issueKey, targetIssueKey, and linkType are required for create action'
        );
      }

      await createIssueLink(
        input.issueKey,
        input.targetIssueKey,
        input.linkType,
        input.comment
      );

      return encodeToon({
        success: true,
        message: `Created "${input.linkType}" link from ${input.issueKey} to ${input.targetIssueKey}`,
      });
    }

    case 'remove': {
      if (!input.linkId) {
        throw new Error('linkId is required for remove action');
      }

      await removeIssueLink(input.linkId);

      return encodeToon({
        success: true,
        message: `Removed link ${input.linkId}`,
      });
    }

    case 'link_to_epic': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for link_to_epic action');
      }

      await linkToEpic(input.issueKey, input.epicKey ?? null);

      return encodeToon({
        success: true,
        message: input.epicKey
          ? `Linked ${input.issueKey} to epic ${input.epicKey}`
          : `Unlinked ${input.issueKey} from epic`,
      });
    }

    case 'list_remote': {
      if (!input.issueKey) {
        throw new Error('issueKey is required for list_remote action');
      }

      const remoteLinks = await getRemoteLinks(input.issueKey);

      if (input.full) {
        return JSON.stringify(remoteLinks, null, 2);
      }

      const simplified = remoteLinks.map((link) => ({
        id: link.id,
        url: link.object.url,
        title: link.object.title,
        summary: link.object.summary,
      }));

      return encodeToon({ remoteLinks: simplified });
    }

    case 'create_remote': {
      if (!input.issueKey || !input.url || !input.title) {
        throw new Error(
          'issueKey, url, and title are required for create_remote action'
        );
      }

      const link = await createRemoteLink(
        input.issueKey,
        input.url,
        input.title,
        input.summary,
        input.iconUrl
      );

      return encodeToon({
        success: true,
        remoteLink: {
          id: link.id,
          url: link.object.url,
          title: link.object.title,
        },
      });
    }

    case 'remove_remote': {
      if (!input.issueKey || !input.remoteLinkId) {
        throw new Error(
          'issueKey and remoteLinkId are required for remove_remote action'
        );
      }

      await removeRemoteLink(input.issueKey, input.remoteLinkId);

      return encodeToon({
        success: true,
        message: `Removed remote link ${input.remoteLinkId}`,
      });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Registers the jira_links tool with the MCP server.
 */
export function registerJiraLinksTool(server: McpServer): void {
  server.tool(
    'jira_links',
    `Manage Jira issue links. Actions:
- get_link_types: Get available link types (Blocks, Relates, Duplicates, etc.)
- list: List all links for an issue
- create: Create a link between two issues
- remove: Remove an issue link
- link_to_epic: Link/unlink an issue to an epic (uses parent field)
- list_remote: List remote/web links for an issue
- create_remote: Add a remote link (URL) to an issue
- remove_remote: Remove a remote link`,
    jiraLinksSchema.shape,
    async (params) => {
      try {
        const input = jiraLinksSchema.parse(params);
        const result = await handleJiraLinks(input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        logger.error(
          'jira_links error',
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
