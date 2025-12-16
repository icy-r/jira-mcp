/**
 * Atlassian Document Format (ADF) utilities.
 * Handles conversion between markdown, plain text, and ADF.
 * Uses the marklassian library for robust markdown-to-ADF conversion.
 * @module utils/adf
 */

import { markdownToAdf as marklassianToAdf } from 'marklassian';
import type { JiraDocument, JiraDocumentNode } from '../jira/types.js';

/**
 * Creates a simple ADF document from plain text.
 *
 * @param text - Plain text content
 * @returns ADF document
 */
export function textToAdf(text: string): JiraDocument {
  if (!text) {
    return {
      type: 'doc',
      version: 1,
      content: [],
    };
  }

  const paragraphs = text.split('\n\n').filter(Boolean);

  return {
    type: 'doc',
    version: 1,
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p.replace(/\n/g, ' ') }],
    })),
  };
}

/**
 * Converts markdown to ADF format using the marklassian library.
 *
 * Supports:
 * - Headings (H1-H6)
 * - Paragraphs and line breaks
 * - Emphasis (bold, italic, strikethrough)
 * - Links and images
 * - Code blocks with language support
 * - Ordered and unordered lists with nesting
 * - Blockquotes
 * - Horizontal rules
 * - Tables
 * - Task lists (GitHub Flavored Markdown)
 *
 * @see https://github.com/jamsinclair/marklassian
 * @see https://marklassian.netlify.app/playground - Interactive playground for testing
 *
 * @param markdown - Markdown content
 * @returns ADF document
 */
export function markdownToAdf(markdown: string): JiraDocument {
  if (!markdown) {
    return { type: 'doc', version: 1, content: [] };
  }

  // Use the marklassian library for robust conversion
  const adfDocument = marklassianToAdf(markdown);

  // The marklassian library returns a compatible ADF document
  return adfDocument as JiraDocument;
}

/**
 * Converts ADF to markdown format.
 * Properly handles tables, nested lists, panels, and other complex structures.
 *
 * @param adf - ADF document or node
 * @returns Markdown string
 */
export function adfToMarkdown(
  adf: JiraDocument | JiraDocumentNode | null | undefined
): string {
  if (!adf) return '';

  if ('type' in adf && adf.type === 'doc') {
    return (adf.content || []).map((node) => nodeToMarkdown(node)).join('\n\n');
  }

  return nodeToMarkdown(adf as JiraDocumentNode);
}

/**
 * Converts a single ADF node to markdown.
 */
function nodeToMarkdown(node: JiraDocumentNode, indent: string = ''): string {
  switch (node.type) {
    case 'text': {
      let text = node.text || '';
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'strong':
              text = `**${text}**`;
              break;
            case 'em':
              text = `*${text}*`;
              break;
            case 'code':
              text = `\`${text}\``;
              break;
            case 'link':
              text = `[${text}](${(mark.attrs as { href?: string })?.href || ''})`;
              break;
            case 'strike':
              text = `~~${text}~~`;
              break;
            case 'underline':
              text = `<u>${text}</u>`;
              break;
            case 'subsup': {
              const type = (mark.attrs as { type?: string })?.type;
              if (type === 'sub') {
                text = `<sub>${text}</sub>`;
              } else if (type === 'sup') {
                text = `<sup>${text}</sup>`;
              }
              break;
            }
            case 'textColor': {
              const color = (mark.attrs as { color?: string })?.color;
              if (color) {
                text = `<span style="color:${color}">${text}</span>`;
              }
              break;
            }
          }
        }
      }
      return text;
    }

    case 'paragraph':
      return (node.content || []).map((n) => nodeToMarkdown(n)).join('');

    case 'heading': {
      const level = (node.attrs as { level?: number })?.level || 1;
      const text = (node.content || []).map((n) => nodeToMarkdown(n)).join('');
      return `${'#'.repeat(level)} ${text}`;
    }

    case 'bulletList':
      return (node.content || [])
        .map((item) => {
          const itemContent = nodeToMarkdown(item, indent + '  ');
          return `${indent}- ${itemContent}`;
        })
        .join('\n');

    case 'orderedList':
      return (node.content || [])
        .map((item, i) => {
          const itemContent = nodeToMarkdown(item, indent + '   ');
          return `${indent}${i + 1}. ${itemContent}`;
        })
        .join('\n');

    case 'listItem': {
      const contents = node.content || [];
      if (contents.length === 0) return '';

      // First element is usually a paragraph
      const firstContent = nodeToMarkdown(contents[0]!);

      // Rest might be nested lists
      const rest = contents
        .slice(1)
        .map((n) => '\n' + nodeToMarkdown(n, indent))
        .join('');

      return firstContent + rest;
    }

    case 'codeBlock': {
      const language = (node.attrs as { language?: string })?.language || '';
      const code = (node.content || []).map((n) => n.text || '').join('');
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }

    case 'blockquote':
      return (node.content || [])
        .map((n) => `> ${nodeToMarkdown(n)}`)
        .join('\n');

    case 'rule':
      return '---';

    case 'hardBreak':
      return '\n';

    case 'mention': {
      const attrs = node.attrs as { text?: string; id?: string };
      return attrs?.text || `@${attrs?.id || 'user'}`;
    }

    case 'emoji': {
      const attrs = node.attrs as { shortName?: string; text?: string };
      return attrs?.text || attrs?.shortName || '';
    }

    case 'inlineCard':
    case 'blockCard': {
      const attrs = node.attrs as { url?: string };
      return attrs?.url || '';
    }

    case 'mediaGroup':
    case 'mediaSingle':
      return '[media]';

    case 'table':
      return tableToMarkdown(node);

    case 'tableRow':
    case 'tableHeader':
    case 'tableCell':
      // These are handled by tableToMarkdown
      return (node.content || []).map((n) => nodeToMarkdown(n)).join('');

    case 'panel': {
      const panelType =
        (node.attrs as { panelType?: string })?.panelType || 'info';
      const content = (node.content || [])
        .map((n) => nodeToMarkdown(n))
        .join('\n');
      return `> **[${panelType.toUpperCase()}]**\n> ${content.split('\n').join('\n> ')}`;
    }

    case 'expand':
    case 'nestedExpand': {
      const title = (node.attrs as { title?: string })?.title || 'Details';
      const content = (node.content || [])
        .map((n) => nodeToMarkdown(n))
        .join('\n');
      return `<details>\n<summary>${title}</summary>\n\n${content}\n</details>`;
    }

    case 'status': {
      const attrs = node.attrs as { text?: string; color?: string };
      return `[${attrs?.text || 'STATUS'}]`;
    }

    case 'date': {
      const timestamp = (node.attrs as { timestamp?: string })?.timestamp;
      if (timestamp) {
        const date = new Date(parseInt(timestamp, 10));
        return date.toLocaleDateString();
      }
      return '[date]';
    }

    case 'taskList':
      return (node.content || []).map((n) => nodeToMarkdown(n)).join('\n');

    case 'taskItem': {
      const state = (node.attrs as { state?: string })?.state;
      const checked = state === 'DONE' ? 'x' : ' ';
      const content = (node.content || [])
        .map((n) => nodeToMarkdown(n))
        .join('');
      return `- [${checked}] ${content}`;
    }

    default:
      // For unknown types, try to extract text content
      if (node.content) {
        return node.content.map((n) => nodeToMarkdown(n)).join('');
      }
      return node.text || '';
  }
}

/**
 * Converts an ADF table node to markdown table format.
 */
function tableToMarkdown(tableNode: JiraDocumentNode): string {
  const rows = tableNode.content || [];
  if (rows.length === 0) return '';

  const tableData: string[][] = [];
  let hasHeader = false;

  for (const row of rows) {
    if (row.type !== 'tableRow') continue;

    const cells = row.content || [];
    const rowData: string[] = [];

    for (const cell of cells) {
      // Check if this is a header cell
      if (cell.type === 'tableHeader') {
        hasHeader = true;
      }

      // Extract cell content
      const cellContent = (cell.content || [])
        .map((n) => nodeToMarkdown(n))
        .join(' ')
        .replace(/\n/g, ' ')
        .trim();

      rowData.push(cellContent);
    }

    tableData.push(rowData);
  }

  if (tableData.length === 0) return '';

  // Determine column widths for alignment
  const colCount = Math.max(...tableData.map((row) => row.length));

  // Build markdown table
  const lines: string[] = [];

  for (let i = 0; i < tableData.length; i++) {
    const row = tableData[i]!;
    // Pad row to have consistent column count
    while (row.length < colCount) {
      row.push('');
    }

    lines.push('| ' + row.join(' | ') + ' |');

    // Add separator after first row (header)
    if (i === 0 && hasHeader) {
      lines.push('| ' + row.map(() => '---').join(' | ') + ' |');
    }
  }

  // If no header was detected but we have data, add separator after first row anyway
  if (!hasHeader && tableData.length > 0) {
    const firstRow = tableData[0]!;
    lines.splice(1, 0, '| ' + firstRow.map(() => '---').join(' | ') + ' |');
  }

  return lines.join('\n');
}

/**
 * Extracts plain text from ADF, stripping all formatting.
 *
 * @param adf - ADF document or node
 * @returns Plain text string
 */
export function adfToPlainText(
  adf: JiraDocument | JiraDocumentNode | null | undefined
): string {
  if (!adf) return '';

  if ('type' in adf && adf.type === 'doc') {
    return (adf.content || [])
      .map((node) => nodeToPlainText(node))
      .join('\n\n');
  }

  return nodeToPlainText(adf as JiraDocumentNode);
}

/**
 * Converts a single ADF node to plain text.
 */
function nodeToPlainText(node: JiraDocumentNode): string {
  switch (node.type) {
    case 'text':
      return node.text || '';

    case 'paragraph':
    case 'heading':
    case 'listItem':
      return (node.content || []).map((n) => nodeToPlainText(n)).join('');

    case 'bulletList':
    case 'orderedList':
      return (node.content || []).map((n) => nodeToPlainText(n)).join('\n');

    case 'codeBlock':
      return (node.content || []).map((n) => n.text || '').join('');

    case 'blockquote':
      return (node.content || []).map((n) => nodeToPlainText(n)).join('\n');

    case 'hardBreak':
      return '\n';

    case 'mention': {
      const attrs = node.attrs as { text?: string };
      return attrs?.text || '';
    }

    case 'emoji': {
      const attrs = node.attrs as { text?: string };
      return attrs?.text || '';
    }

    default:
      if (node.content) {
        return node.content.map((n) => nodeToPlainText(n)).join('');
      }
      return node.text || '';
  }
}

/**
 * Checks if a value is an ADF document.
 */
export function isAdfDocument(value: unknown): value is JiraDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type: string }).type === 'doc' &&
    'version' in value &&
    'content' in value
  );
}

/**
 * Safely extracts text from a field that could be string or ADF.
 *
 * @param value - String or ADF document
 * @returns Plain text
 */
export function extractText(
  value: string | JiraDocument | null | undefined
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (isAdfDocument(value)) return adfToPlainText(value);
  return '';
}
