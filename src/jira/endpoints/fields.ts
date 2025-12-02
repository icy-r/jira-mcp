/**
 * Jira Fields API endpoints.
 * @module jira/endpoints/fields
 */

import { getClient } from '../client.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('jira-fields');

/**
 * Field representation.
 */
export interface JiraField {
  id: string;
  key?: string;
  name: string;
  custom: boolean;
  orderable: boolean;
  navigable: boolean;
  searchable: boolean;
  clauseNames: string[];
  schema?: {
    type: string;
    items?: string;
    system?: string;
    custom?: string;
    customId?: number;
  };
  untranslatedName?: string;
}

/**
 * Common custom field names that are frequently used.
 */
export const COMMON_CUSTOM_FIELDS = [
  'Story Points',
  'Sprint',
  'Team',
  'Epic Name',
  'Start date',
  'Due date',
  'Story point estimate',
  'Flagged',
];

// Cache for discovered fields
let fieldsCache: JiraField[] | null = null;
let customFieldsMap: Map<string, string> | null = null;

/**
 * Gets all fields available in Jira.
 *
 * @param useCache - Whether to use cached results (default: true)
 * @returns List of all fields
 *
 * @example
 * const fields = await getAllFields();
 */
export async function getAllFields(
  useCache: boolean = true
): Promise<JiraField[]> {
  if (useCache && fieldsCache) {
    return fieldsCache;
  }

  logger.debug('Getting all fields');

  const fields = await getClient().get<JiraField[]>('/rest/api/3/field');
  fieldsCache = fields;

  // Build custom fields map
  customFieldsMap = new Map();
  for (const field of fields) {
    if (field.custom) {
      customFieldsMap.set(field.name.toLowerCase(), field.id);
    }
  }

  return fields;
}

/**
 * Gets only custom fields.
 *
 * @returns List of custom fields
 */
export async function getCustomFields(): Promise<JiraField[]> {
  const fields = await getAllFields();
  return fields.filter((f) => f.custom);
}

/**
 * Searches for fields by name (fuzzy match).
 *
 * @param query - Search query
 * @returns Matching fields
 *
 * @example
 * const fields = await searchFields('story');
 * // Returns fields like 'Story Points', 'Story point estimate', etc.
 */
export async function searchFields(query: string): Promise<JiraField[]> {
  const fields = await getAllFields();
  const lowerQuery = query.toLowerCase();

  return fields.filter(
    (f) =>
      f.name.toLowerCase().includes(lowerQuery) ||
      f.id.toLowerCase().includes(lowerQuery) ||
      f.clauseNames.some((c) => c.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Gets the field ID for a field name.
 * Useful for custom fields where you know the name but need the ID.
 *
 * @param fieldName - The field name to look up
 * @returns The field ID or null if not found
 *
 * @example
 * const storyPointsId = await getFieldId('Story Points');
 * // Returns something like 'customfield_10016'
 */
export async function getFieldId(fieldName: string): Promise<string | null> {
  const fields = await getAllFields();
  const field = fields.find(
    (f) => f.name.toLowerCase() === fieldName.toLowerCase()
  );
  return field?.id ?? null;
}

/**
 * Gets commonly used custom field IDs.
 * Auto-discovers Story Points, Sprint, Team, etc.
 *
 * @returns Map of field names to their IDs
 */
export async function getCommonCustomFieldIds(): Promise<
  Record<string, string>
> {
  const fields = await getAllFields();
  const result: Record<string, string> = {};

  for (const fieldName of COMMON_CUSTOM_FIELDS) {
    const field = fields.find(
      (f) => f.name.toLowerCase() === fieldName.toLowerCase()
    );
    if (field) {
      result[fieldName] = field.id;
    }
  }

  return result;
}

/**
 * Builds a minimal fields list including common custom fields.
 * Used for data minimization strategy.
 *
 * @param baseFields - Base fields to include
 * @returns Fields array with custom field IDs
 */
export async function buildMinimalFieldsList(
  baseFields: string[] = [
    'summary',
    'status',
    'assignee',
    'priority',
    'issuetype',
    'updated',
    'parent',
  ]
): Promise<string[]> {
  const customFields = await getCommonCustomFieldIds();
  const customFieldIds = Object.values(customFields);

  return [...baseFields, ...customFieldIds];
}

/**
 * Clears the fields cache.
 * Call this if fields have been added/removed.
 */
export function clearFieldsCache(): void {
  fieldsCache = null;
  customFieldsMap = null;
}

/**
 * Gets field suggestions for autocomplete.
 *
 * @param prefix - Prefix to match
 * @param limit - Maximum results (default: 10)
 * @returns Matching field names and IDs
 */
export async function getFieldSuggestions(
  prefix: string,
  limit: number = 10
): Promise<Array<{ name: string; id: string; custom: boolean }>> {
  const fields = await searchFields(prefix);

  return fields.slice(0, limit).map((f) => ({
    name: f.name,
    id: f.id,
    custom: f.custom,
  }));
}
