/**
 * Audit logging for Jira operations.
 * Tracks all create, update, and delete operations for accountability.
 * @module utils/audit
 */

import { createLogger } from './logger.js';
import * as fs from 'fs';

const logger = createLogger('audit');

/**
 * Audit log entry.
 */
export interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  user?: string;
  input: Record<string, unknown>;
  result: 'success' | 'failure' | 'dry-run';
  error?: string;
  dryRun: boolean;
}

/**
 * Auditable actions.
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'transition'
  | 'assign'
  | 'link'
  | 'unlink'
  | 'move';

/**
 * Auditable resources.
 */
export type AuditResource =
  | 'issue'
  | 'comment'
  | 'worklog'
  | 'sprint'
  | 'version'
  | 'link'
  | 'remote_link';

/**
 * Audit configuration.
 */
export interface AuditConfig {
  /** Enable audit logging */
  enabled: boolean;
  /** Log to console */
  logToConsole: boolean;
  /** Log to file */
  logToFile: boolean;
  /** Audit log file path */
  logFilePath: string;
  /** Require confirmation for destructive actions */
  requireConfirmation: boolean;
  /** Actions that require confirmation */
  confirmationRequired: AuditAction[];
}

/**
 * Default audit configuration.
 */
const defaultConfig: AuditConfig = {
  enabled: true,
  logToConsole: true,
  logToFile: true,
  logFilePath: './jira-audit.log',
  requireConfirmation: true,
  confirmationRequired: ['delete', 'update'],
};

let config: AuditConfig = { ...defaultConfig };
let dryRunMode = false;

/**
 * In-memory audit log for the current session.
 */
const sessionLog: AuditEntry[] = [];

/**
 * Configures the audit system.
 */
export function configureAudit(options: Partial<AuditConfig>): void {
  config = { ...config, ...options };
  logger.info('Audit configuration updated', { config });
}

/**
 * Enables or disables dry-run mode.
 * In dry-run mode, no actual changes are made to Jira.
 */
export function setDryRunMode(enabled: boolean): void {
  dryRunMode = enabled;
  logger.info(`Dry-run mode ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Checks if dry-run mode is enabled.
 */
export function isDryRunMode(): boolean {
  return dryRunMode;
}

/**
 * Logs an audit entry.
 */
export function logAudit(
  entry: Omit<AuditEntry, 'timestamp' | 'dryRun'>
): void {
  if (!config.enabled) return;

  const fullEntry: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    dryRun: dryRunMode,
  };

  // Add to session log
  sessionLog.push(fullEntry);

  // Log to console
  if (config.logToConsole) {
    const emoji = getActionEmoji(entry.action, entry.result);
    const dryRunLabel = dryRunMode ? ' [DRY-RUN]' : '';
    logger.info(
      `${emoji} AUDIT${dryRunLabel}: ${entry.action} ${entry.resource} ${entry.resourceId || ''}`,
      {
        result: entry.result,
        input: sanitizeForLog(entry.input),
      }
    );
  }

  // Log to file
  if (config.logToFile) {
    appendToAuditFile(fullEntry);
  }
}

/**
 * Gets an emoji for the action type.
 */
function getActionEmoji(
  action: AuditAction,
  result: 'success' | 'failure' | 'dry-run'
): string {
  if (result === 'failure') return '❌';
  if (result === 'dry-run') return '🔍';

  switch (action) {
    case 'create':
      return '✨';
    case 'update':
      return '📝';
    case 'delete':
      return '🗑️';
    case 'transition':
      return '➡️';
    case 'assign':
      return '👤';
    case 'link':
      return '🔗';
    case 'unlink':
      return '🔓';
    case 'move':
      return '📦';
    default:
      return '📋';
  }
}

/**
 * Sanitizes input for logging (removes sensitive data).
 */
function sanitizeForLog(
  input: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];

  for (const [key, value] of Object.entries(input)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = value.substring(0, 500) + '... [truncated]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Appends an entry to the audit log file.
 */
function appendToAuditFile(entry: AuditEntry): void {
  try {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(config.logFilePath, logLine, 'utf8');
  } catch (error) {
    logger.error(
      'Failed to write to audit log file',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Gets the session audit log.
 */
export function getSessionLog(): AuditEntry[] {
  return [...sessionLog];
}

/**
 * Gets recent audit entries from the log file.
 */
export function getRecentAuditEntries(count: number = 50): AuditEntry[] {
  try {
    if (!fs.existsSync(config.logFilePath)) {
      return [];
    }

    const content = fs.readFileSync(config.logFilePath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries = lines
      .slice(-count)
      .map((line) => {
        try {
          return JSON.parse(line) as AuditEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is AuditEntry => e !== null);

    return entries;
  } catch (error) {
    logger.error(
      'Failed to read audit log file',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * Clears the session audit log.
 */
export function clearSessionLog(): void {
  sessionLog.length = 0;
}

/**
 * Checks if an action requires confirmation.
 */
export function requiresConfirmation(action: AuditAction): boolean {
  return (
    config.requireConfirmation && config.confirmationRequired.includes(action)
  );
}

/**
 * Validates that a confirmation was provided for destructive actions.
 */
export function validateConfirmation(
  action: AuditAction,
  confirmed?: boolean
): { valid: boolean; message?: string } {
  if (!requiresConfirmation(action)) {
    return { valid: true };
  }

  if (dryRunMode) {
    return { valid: true }; // Dry-run doesn't need confirmation
  }

  if (!confirmed) {
    return {
      valid: false,
      message: `Action '${action}' requires explicit confirmation. Set 'confirm: true' to proceed.`,
    };
  }

  return { valid: true };
}

/**
 * Creates a summary of changes for dry-run mode.
 */
export function createDryRunSummary(
  action: AuditAction,
  resource: AuditResource,
  resourceId: string | undefined,
  input: Record<string, unknown>
): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════',
    '  🔍 DRY-RUN MODE - No changes will be made',
    '═══════════════════════════════════════════════════════════',
    '',
    `  Action:   ${action.toUpperCase()}`,
    `  Resource: ${resource}`,
  ];

  if (resourceId) {
    lines.push(`  Target:   ${resourceId}`);
  }

  lines.push('', '  Proposed Changes:');

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) {
      const displayValue =
        typeof value === 'string' && value.length > 100
          ? value.substring(0, 100) + '...'
          : JSON.stringify(value);
      lines.push(`    • ${key}: ${displayValue}`);
    }
  }

  lines.push(
    '',
    '═══════════════════════════════════════════════════════════',
    '  To execute this change, disable dry-run mode or',
    '  set dryRun: false in your request.',
    '═══════════════════════════════════════════════════════════'
  );

  return lines.join('\n');
}

/**
 * Formats audit entries for display.
 */
export function formatAuditLog(entries: AuditEntry[]): string {
  if (entries.length === 0) {
    return 'No audit entries found.';
  }

  const lines: string[] = [
    '═══════════════════════════════════════════════════════════',
    '  📋 AUDIT LOG',
    '═══════════════════════════════════════════════════════════',
    '',
  ];

  for (const entry of entries) {
    const emoji = getActionEmoji(entry.action, entry.result);
    const dryRunLabel = entry.dryRun ? ' [DRY-RUN]' : '';
    const time = new Date(entry.timestamp).toLocaleString();

    lines.push(`${emoji} ${time}${dryRunLabel}`);
    lines.push(
      `   ${entry.action.toUpperCase()} ${entry.resource} ${entry.resourceId || ''}`
    );
    lines.push(`   Result: ${entry.result}`);

    if (entry.error) {
      lines.push(`   Error: ${entry.error}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}
