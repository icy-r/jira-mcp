import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  logAudit,
  setDryRunMode,
  isDryRunMode,
  getSessionLog,
  clearSessionLog,
  validateConfirmation,
  createDryRunSummary,
  configureAudit,
} from '../../../src/utils/audit.js';

describe('Audit Module', () => {
  beforeEach(() => {
    clearSessionLog();
    setDryRunMode(false);
    configureAudit({
      enabled: true,
      logToConsole: false,
      logToFile: false,
      requireConfirmation: true,
      confirmationRequired: ['update', 'delete'],
    });
  });

  afterEach(() => {
    clearSessionLog();
    setDryRunMode(false);
  });

  describe('Dry-run mode', () => {
    it('should default to false', () => {
      expect(isDryRunMode()).toBe(false);
    });

    it('should toggle dry-run mode', () => {
      setDryRunMode(true);
      expect(isDryRunMode()).toBe(true);

      setDryRunMode(false);
      expect(isDryRunMode()).toBe(false);
    });
  });

  describe('Session logging', () => {
    it('should start with empty log', () => {
      expect(getSessionLog()).toHaveLength(0);
    });

    it('should log audit entries', () => {
      logAudit({
        action: 'create',
        resource: 'issue',
        resourceId: 'PROJ-123',
        input: { summary: 'Test' },
        result: 'success',
      });

      const log = getSessionLog();
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe('create');
      expect(log[0].resource).toBe('issue');
      expect(log[0].resourceId).toBe('PROJ-123');
      expect(log[0].result).toBe('success');
    });

    it('should include dry-run flag in entries', () => {
      setDryRunMode(true);

      logAudit({
        action: 'update',
        resource: 'issue',
        resourceId: 'PROJ-123',
        input: { summary: 'Test' },
        result: 'dry-run',
      });

      const log = getSessionLog();
      expect(log[0].dryRun).toBe(true);
    });

    it('should clear session log', () => {
      logAudit({
        action: 'delete',
        resource: 'issue',
        resourceId: 'PROJ-123',
        input: {},
        result: 'success',
      });

      expect(getSessionLog()).toHaveLength(1);

      clearSessionLog();
      expect(getSessionLog()).toHaveLength(0);
    });
  });

  describe('Confirmation validation', () => {
    it('should require confirmation for delete', () => {
      const result = validateConfirmation('delete', false);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('requires explicit confirmation');
    });

    it('should require confirmation for update', () => {
      const result = validateConfirmation('update', false);
      expect(result.valid).toBe(false);
    });

    it('should pass when confirmation is provided', () => {
      const result = validateConfirmation('delete', true);
      expect(result.valid).toBe(true);
    });

    it('should not require confirmation for create', () => {
      const result = validateConfirmation('create', false);
      expect(result.valid).toBe(true);
    });

    it('should not require confirmation for read actions', () => {
      const result = validateConfirmation('assign', false);
      expect(result.valid).toBe(true);
    });
  });

  describe('Dry-run summary', () => {
    it('should create formatted summary', () => {
      const summary = createDryRunSummary('update', 'issue', 'PROJ-123', {
        summary: 'New summary',
        priority: 'High',
      });

      expect(summary).toContain('DRY-RUN MODE');
      expect(summary).toContain('UPDATE');
      expect(summary).toContain('issue');
      expect(summary).toContain('PROJ-123');
      expect(summary).toContain('summary');
      expect(summary).toContain('priority');
    });

    it('should truncate long values', () => {
      const longValue = 'x'.repeat(200);
      const summary = createDryRunSummary('create', 'issue', undefined, {
        description: longValue,
      });

      expect(summary).toContain('...');
      expect(summary.length).toBeLessThan(longValue.length + 500);
    });
  });

  describe('Configuration', () => {
    it('should disable confirmation requirement', () => {
      configureAudit({ requireConfirmation: false });

      const result = validateConfirmation('delete', false);
      expect(result.valid).toBe(true);
    });
  });
});
