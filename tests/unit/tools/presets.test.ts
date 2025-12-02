/**
 * Tests for JQL search presets.
 */

import { describe, it, expect } from 'vitest';
import {
  SEARCH_PRESETS,
  getPresetJql,
  buildSearchJql,
  getPresetDescriptions,
} from '../../../src/tools/presets.js';

describe('Search Presets', () => {
  describe('SEARCH_PRESETS', () => {
    it('should have all expected presets', () => {
      expect(SEARCH_PRESETS).toHaveProperty('my_issues');
      expect(SEARCH_PRESETS).toHaveProperty('current_sprint');
      expect(SEARCH_PRESETS).toHaveProperty('my_sprint_issues');
      expect(SEARCH_PRESETS).toHaveProperty('recently_updated');
      expect(SEARCH_PRESETS).toHaveProperty('blocked');
      expect(SEARCH_PRESETS).toHaveProperty('unassigned_sprint');
    });

    it('should have valid JQL for each preset', () => {
      for (const [, jql] of Object.entries(SEARCH_PRESETS)) {
        expect(typeof jql).toBe('string');
        expect(jql.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getPresetJql', () => {
    it('should return JQL for a preset', () => {
      const jql = getPresetJql('my_issues');
      expect(jql).toBe(SEARCH_PRESETS.my_issues);
    });

    it('should add project filter when projectKey provided', () => {
      const jql = getPresetJql('my_issues', 'PROJ');
      expect(jql).toContain('project = PROJ');
      expect(jql).toContain('assignee = currentUser()');
      expect(jql).toContain('ORDER BY');
    });

    it('should preserve ORDER BY when adding project filter', () => {
      const jql = getPresetJql('current_sprint', 'TEST');
      expect(jql).toContain('project = TEST');
      expect(jql).toContain('ORDER BY rank');
    });
  });

  describe('buildSearchJql', () => {
    it('should use custom JQL when provided', () => {
      const jql = buildSearchJql({ jql: 'status = Open' });
      expect(jql).toBe('status = Open');
    });

    it('should use preset when no custom JQL', () => {
      const jql = buildSearchJql({ preset: 'blocked' });
      expect(jql).toBe(SEARCH_PRESETS.blocked);
    });

    it('should add project filter to custom JQL', () => {
      const jql = buildSearchJql({
        jql: 'status = Open ORDER BY created',
        projectKey: 'PROJ',
      });
      expect(jql).toContain('project = PROJ');
      expect(jql).toContain('status = Open');
    });

    it('should not duplicate project filter if already present', () => {
      const jql = buildSearchJql({
        jql: 'project = OTHER AND status = Open',
        projectKey: 'PROJ',
      });
      expect(jql).not.toContain('project = PROJ');
    });

    it('should return default JQL when nothing provided', () => {
      const jql = buildSearchJql({});
      expect(jql).toContain('ORDER BY updated DESC');
    });

    it('should return project-scoped default when only projectKey provided', () => {
      const jql = buildSearchJql({ projectKey: 'PROJ' });
      expect(jql).toContain('project = PROJ');
      expect(jql).toContain('ORDER BY updated DESC');
    });
  });

  describe('getPresetDescriptions', () => {
    it('should return descriptions for all presets', () => {
      const descriptions = getPresetDescriptions();
      expect(descriptions.length).toBeGreaterThan(0);

      for (const desc of descriptions) {
        expect(desc).toHaveProperty('name');
        expect(desc).toHaveProperty('description');
        expect(desc).toHaveProperty('jql');
      }
    });

    it('should have matching JQL for each preset', () => {
      const descriptions = getPresetDescriptions();

      for (const desc of descriptions) {
        expect(desc.jql).toBe(SEARCH_PRESETS[desc.name]);
      }
    });
  });
});
