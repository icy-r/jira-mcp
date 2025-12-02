/**
 * Tests for board resolver utility.
 */

import { describe, it, expect } from 'vitest';
import { extractProjectKey } from '../../../src/utils/board-resolver.js';

describe('Board Resolver', () => {
  describe('extractProjectKey', () => {
    it('should extract project key from issue key', () => {
      expect(extractProjectKey('PROJ-123')).toBe('PROJ');
      expect(extractProjectKey('TEST-1')).toBe('TEST');
      expect(extractProjectKey('ABC-99999')).toBe('ABC');
    });

    it('should handle lowercase issue keys', () => {
      expect(extractProjectKey('proj-123')).toBe('PROJ');
    });

    it('should handle alphanumeric project keys', () => {
      expect(extractProjectKey('PROJ2-123')).toBe('PROJ2');
      expect(extractProjectKey('A1B2-456')).toBe('A1B2');
    });

    it('should throw for invalid issue keys', () => {
      expect(() => extractProjectKey('invalid')).toThrow('Invalid issue key');
      expect(() => extractProjectKey('123-ABC')).toThrow('Invalid issue key');
      expect(() => extractProjectKey('')).toThrow('Invalid issue key');
    });
  });
});
