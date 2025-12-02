/**
 * Tests for ADF (Atlassian Document Format) utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  textToAdf,
  markdownToAdf,
  adfToMarkdown,
  adfToPlainText,
  isAdfDocument,
  extractText,
} from '../../../src/utils/adf.js';
import type { JiraDocument } from '../../../src/jira/types.js';

describe('ADF Utilities', () => {
  describe('textToAdf', () => {
    it('should convert plain text to ADF', () => {
      const result = textToAdf('Hello world');
      expect(result.type).toBe('doc');
      expect(result.version).toBe(1);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('paragraph');
    });

    it('should handle empty text', () => {
      const result = textToAdf('');
      expect(result.content).toHaveLength(0);
    });

    it('should split paragraphs on double newlines', () => {
      const result = textToAdf('First paragraph\n\nSecond paragraph');
      expect(result.content).toHaveLength(2);
    });
  });

  describe('markdownToAdf', () => {
    it('should convert headings', () => {
      const result = markdownToAdf('# Heading 1\n## Heading 2');
      expect(result.content[0].type).toBe('heading');
      expect(result.content[0].attrs).toEqual({ level: 1 });
      expect(result.content[1].type).toBe('heading');
      expect(result.content[1].attrs).toEqual({ level: 2 });
    });

    it('should convert bullet lists', () => {
      const result = markdownToAdf('- Item 1\n- Item 2');
      expect(result.content[0].type).toBe('bulletList');
      expect(result.content[0].content).toHaveLength(2);
    });

    it('should convert ordered lists', () => {
      const result = markdownToAdf('1. First\n2. Second');
      expect(result.content[0].type).toBe('orderedList');
      expect(result.content[0].content).toHaveLength(2);
    });

    it('should convert code blocks', () => {
      const result = markdownToAdf('```typescript\nconst x = 1;\n```');
      expect(result.content[0].type).toBe('codeBlock');
      expect(result.content[0].attrs).toEqual({ language: 'typescript' });
    });

    it('should convert blockquotes', () => {
      const result = markdownToAdf('> Quote text');
      expect(result.content[0].type).toBe('blockquote');
    });

    it('should handle empty markdown', () => {
      const result = markdownToAdf('');
      expect(result.content).toHaveLength(0);
    });
  });

  describe('adfToMarkdown', () => {
    it('should convert ADF to markdown', () => {
      const adf: JiraDocument = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Some text' }],
          },
        ],
      };

      const result = adfToMarkdown(adf);
      expect(result).toContain('# Title');
      expect(result).toContain('Some text');
    });

    it('should handle bold and italic', () => {
      const adf: JiraDocument = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'bold', marks: [{ type: 'strong' }] },
              { type: 'text', text: ' and ' },
              { type: 'text', text: 'italic', marks: [{ type: 'em' }] },
            ],
          },
        ],
      };

      const result = adfToMarkdown(adf);
      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
    });

    it('should handle null/undefined', () => {
      expect(adfToMarkdown(null)).toBe('');
      expect(adfToMarkdown(undefined)).toBe('');
    });
  });

  describe('adfToPlainText', () => {
    it('should extract plain text from ADF', () => {
      const adf: JiraDocument = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'text', text: 'world', marks: [{ type: 'strong' }] },
            ],
          },
        ],
      };

      const result = adfToPlainText(adf);
      expect(result).toBe('Hello world');
    });

    it('should handle nested content', () => {
      const adf: JiraDocument = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Item 1' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Item 2' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = adfToPlainText(adf);
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });
  });

  describe('isAdfDocument', () => {
    it('should return true for valid ADF', () => {
      const adf = { type: 'doc', version: 1, content: [] };
      expect(isAdfDocument(adf)).toBe(true);
    });

    it('should return false for non-ADF', () => {
      expect(isAdfDocument(null)).toBe(false);
      expect(isAdfDocument('string')).toBe(false);
      expect(isAdfDocument({ type: 'other' })).toBe(false);
    });
  });

  describe('extractText', () => {
    it('should extract text from string', () => {
      expect(extractText('Hello')).toBe('Hello');
    });

    it('should extract text from ADF', () => {
      const adf: JiraDocument = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
        ],
      };
      expect(extractText(adf)).toBe('Hello');
    });

    it('should handle null/undefined', () => {
      expect(extractText(null)).toBe('');
      expect(extractText(undefined)).toBe('');
    });
  });
});
