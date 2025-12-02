/**
 * Atlassian Document Format (ADF) utilities.
 * Handles conversion between markdown, plain text, and ADF.
 * @module utils/adf
 */

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
 * Converts markdown to ADF format.
 * Supports: headings, lists, code blocks, bold, italic, links, inline code.
 *
 * @param markdown - Markdown content
 * @returns ADF document
 */
export function markdownToAdf(markdown: string): JiraDocument {
  if (!markdown) {
    return { type: 'doc', version: 1, content: [] };
  }

  const lines = markdown.split('\n');
  const content: JiraDocumentNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      content.push({
        type: 'codeBlock',
        attrs: language ? { language } : undefined,
        content: [{ type: 'text', text: codeLines.join('\n') }],
      });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineMarkdown(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s+/)) {
      const listItems: JiraDocumentNode[] = [];
      while (i < lines.length && (lines[i] ?? '').match(/^[-*]\s+/)) {
        const itemText = (lines[i] ?? '').replace(/^[-*]\s+/, '');
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInlineMarkdown(itemText),
            },
          ],
        });
        i++;
      }
      content.push({
        type: 'bulletList',
        content: listItems,
      });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const listItems: JiraDocumentNode[] = [];
      while (i < lines.length && (lines[i] ?? '').match(/^\d+\.\s+/)) {
        const itemText = (lines[i] ?? '').replace(/^\d+\.\s+/, '');
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInlineMarkdown(itemText),
            },
          ],
        });
        i++;
      }
      content.push({
        type: 'orderedList',
        content: listItems,
      });
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('>')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s*/, ''));
        i++;
      }
      content.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: parseInlineMarkdown(quoteLines.join(' ')),
          },
        ],
      });
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      content.push({ type: 'rule' });
      i++;
      continue;
    }

    // Empty line (skip)
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular paragraph
    content.push({
      type: 'paragraph',
      content: parseInlineMarkdown(line),
    });
    i++;
  }

  return { type: 'doc', version: 1, content };
}

/**
 * Parses inline markdown formatting.
 */
function parseInlineMarkdown(text: string): JiraDocumentNode[] {
  const nodes: JiraDocumentNode[] = [];
  let remaining = text;

  while (remaining) {
    // Bold (**text** or __text__)
    let match = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    if (!match) {
      match = remaining.match(/^(.*?)__(.+?)__(.*)/s);
    }
    if (match && match[2] && match[3] !== undefined) {
      if (match[1]) {
        nodes.push(...parseInlineMarkdown(match[1]));
      }
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'strong' }],
      });
      remaining = match[3];
      continue;
    }

    // Italic (*text* or _text_)
    match = remaining.match(/^(.*?)\*([^*]+)\*(.*)/s);
    if (!match) {
      match = remaining.match(/^(.*?)_([^_]+)_(.*)/s);
    }
    if (match && match[1] !== undefined && match[2] && match[3] !== undefined) {
      if (match[1]) {
        nodes.push(...parseInlineMarkdown(match[1]));
      }
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'em' }],
      });
      remaining = match[3];
      continue;
    }

    // Inline code (`code`)
    match = remaining.match(/^(.*?)`([^`]+)`(.*)/s);
    if (match && match[2] && match[3] !== undefined) {
      if (match[1]) {
        nodes.push(...parseInlineMarkdown(match[1]));
      }
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'code' }],
      });
      remaining = match[3];
      continue;
    }

    // Link [text](url)
    match = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)/s);
    if (match && match[2] && match[3] && match[4] !== undefined) {
      if (match[1]) {
        nodes.push(...parseInlineMarkdown(match[1]));
      }
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'link', attrs: { href: match[3] } }],
      });
      remaining = match[4];
      continue;
    }

    // Plain text (no more formatting)
    nodes.push({ type: 'text', text: remaining });
    break;
  }

  return nodes;
}

/**
 * Converts ADF to markdown format.
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
function nodeToMarkdown(node: JiraDocumentNode): string {
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
        .map((item) => `- ${nodeToMarkdown(item)}`)
        .join('\n');

    case 'orderedList':
      return (node.content || [])
        .map((item, i) => `${i + 1}. ${nodeToMarkdown(item)}`)
        .join('\n');

    case 'listItem':
      return (node.content || []).map((n) => nodeToMarkdown(n)).join('');

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
      // Simplified table handling
      return '[table]';

    default:
      // For unknown types, try to extract text content
      if (node.content) {
        return node.content.map((n) => nodeToMarkdown(n)).join('');
      }
      return node.text || '';
  }
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
