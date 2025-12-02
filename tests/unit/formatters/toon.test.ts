/**
 * Tests for TOON formatter.
 */

import { describe, it, expect } from 'vitest';
import {
  encodeToon,
  formatResponse,
  simplifyIssue,
  simplifyIssues,
  simplifyProject,
  simplifySprint,
  simplifyUser,
  simplifyComment,
} from '../../../src/formatters/toon.js';

describe('encodeToon', () => {
  it('should encode simple object', () => {
    const data = { name: 'Alice', age: 30 };
    const result = encodeToon(data);

    expect(result).toContain('name');
    expect(result).toContain('Alice');
    expect(result).toContain('30');
  });

  it('should encode array of objects', () => {
    const data = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    };
    const result = encodeToon(data);

    expect(result).toContain('users');
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
  });

  it('should handle encoding errors gracefully', () => {
    // Use a valid object that might cause issues
    const data = { value: undefined };

    // Should not throw and should return some output
    const result = encodeToon(data);
    expect(result).toBeDefined();
  });
});

describe('formatResponse', () => {
  it('should use TOON when enabled', () => {
    const data = { key: 'value' };
    const toon = formatResponse(data, true);
    const json = formatResponse(data, false);

    // TOON format is different from JSON
    expect(toon).not.toBe(json);
  });

  it('should use JSON when TOON disabled', () => {
    const data = { key: 'value' };
    const result = formatResponse(data, false);

    expect(result).toBe(JSON.stringify(data, null, 2));
  });
});

describe('simplifyIssue', () => {
  it('should extract relevant fields', () => {
    const issue = {
      key: 'PROJ-123',
      fields: {
        summary: 'Test issue',
        status: { name: 'Open' },
        priority: { name: 'High' },
        assignee: { displayName: 'Alice' },
        issuetype: { name: 'Bug' },
        created: '2024-01-15T10:00:00.000Z',
        updated: '2024-01-16T15:30:00.000Z',
      },
    };

    const result = simplifyIssue(issue);

    expect(result).toEqual({
      key: 'PROJ-123',
      summary: 'Test issue',
      status: 'Open',
      priority: 'High',
      assignee: 'Alice',
      type: 'Bug',
      created: '2024-01-15',
      updated: '2024-01-16',
    });
  });

  it('should handle null assignee', () => {
    const issue = {
      key: 'PROJ-123',
      fields: {
        summary: 'Test issue',
        status: { name: 'Open' },
        assignee: null,
      },
    };

    const result = simplifyIssue(issue);

    expect(result.assignee).toBe('Unassigned');
  });
});

describe('simplifyIssues', () => {
  it('should simplify array of issues', () => {
    const issues = [
      {
        key: 'PROJ-1',
        fields: { summary: 'Issue 1', status: { name: 'Open' } },
      },
      {
        key: 'PROJ-2',
        fields: { summary: 'Issue 2', status: { name: 'Done' } },
      },
    ];

    const result = simplifyIssues(issues);

    expect(result).toHaveLength(2);
    expect(result[0]?.key).toBe('PROJ-1');
    expect(result[1]?.key).toBe('PROJ-2');
  });
});

describe('simplifyProject', () => {
  it('should extract project fields', () => {
    const project = {
      key: 'PROJ',
      name: 'Test Project',
      description: 'A test project',
      lead: { displayName: 'Alice' },
      projectTypeKey: 'software',
    };

    const result = simplifyProject(project);

    expect(result).toEqual({
      key: 'PROJ',
      name: 'Test Project',
      description: 'A test project',
      lead: 'Alice',
      type: 'software',
    });
  });
});

describe('simplifySprint', () => {
  it('should extract sprint fields', () => {
    const sprint = {
      id: 123,
      name: 'Sprint 1',
      state: 'active',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-14T00:00:00.000Z',
      goal: 'Complete feature X',
    };

    const result = simplifySprint(sprint);

    expect(result).toEqual({
      id: 123,
      name: 'Sprint 1',
      state: 'active',
      start: '2024-01-01',
      end: '2024-01-14',
      goal: 'Complete feature X',
    });
  });
});

describe('simplifyUser', () => {
  it('should extract user fields', () => {
    const user = {
      accountId: '12345',
      displayName: 'Alice Smith',
      emailAddress: 'alice@example.com',
      active: true,
    };

    const result = simplifyUser(user);

    expect(result).toEqual({
      id: '12345',
      name: 'Alice Smith',
      email: 'alice@example.com',
      active: true,
    });
  });
});

describe('simplifyComment', () => {
  it('should extract comment fields with string body', () => {
    const comment = {
      id: '1',
      author: { displayName: 'Alice' },
      body: 'This is a comment',
      created: '2024-01-15T10:00:00.000Z',
      updated: '2024-01-15T10:00:00.000Z',
    };

    const result = simplifyComment(comment);

    expect(result).toEqual({
      id: '1',
      author: 'Alice',
      body: 'This is a comment',
      created: '2024-01-15',
    });
  });

  it('should extract text from ADF body', () => {
    const comment = {
      id: '1',
      author: { displayName: 'Alice' },
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'ADF comment text' }],
          },
        ],
      },
      created: '2024-01-15T10:00:00.000Z',
      updated: '2024-01-15T10:00:00.000Z',
    };

    const result = simplifyComment(comment);

    expect(result.body).toBe('ADF comment text');
  });

  it('should truncate long comments', () => {
    const longText = 'x'.repeat(300);
    const comment = {
      id: '1',
      author: { displayName: 'Alice' },
      body: longText,
      created: '2024-01-15T10:00:00.000Z',
      updated: '2024-01-15T10:00:00.000Z',
    };

    const result = simplifyComment(comment);

    expect((result.body as string).length).toBe(200);
  });
});
