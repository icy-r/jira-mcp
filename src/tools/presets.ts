/**
 * JQL search presets for common queries.
 * These provide shortcuts for frequently used searches.
 * @module tools/presets
 */

/**
 * Available search preset names.
 */
export type SearchPreset =
  | 'my_issues'
  | 'current_sprint'
  | 'my_sprint_issues'
  | 'recently_updated'
  | 'blocked'
  | 'unassigned_sprint'
  | 'my_watching'
  | 'my_reported'
  | 'high_priority'
  | 'due_soon'
  | 'created_today'
  | 'updated_today';

/**
 * Preset JQL queries.
 */
export const SEARCH_PRESETS: Record<SearchPreset, string> = {
  /**
   * Issues assigned to the current user, ordered by most recently updated.
   */
  my_issues: 'assignee = currentUser() ORDER BY updated DESC',

  /**
   * All issues in active sprints, ordered by rank.
   */
  current_sprint: 'sprint in openSprints() ORDER BY rank ASC',

  /**
   * Issues assigned to current user in active sprints.
   */
  my_sprint_issues:
    'assignee = currentUser() AND sprint in openSprints() ORDER BY rank ASC',

  /**
   * Issues updated in the last 7 days.
   */
  recently_updated: 'updated >= -7d ORDER BY updated DESC',

  /**
   * Blocked or flagged issues.
   */
  blocked:
    '(status = Blocked OR "Flagged" is not EMPTY) ORDER BY priority DESC',

  /**
   * Unassigned issues in active sprints.
   */
  unassigned_sprint:
    'assignee is EMPTY AND sprint in openSprints() ORDER BY rank ASC',

  /**
   * Issues the current user is watching.
   */
  my_watching: 'watcher = currentUser() ORDER BY updated DESC',

  /**
   * Issues reported by the current user.
   */
  my_reported: 'reporter = currentUser() ORDER BY created DESC',

  /**
   * High priority issues (Highest, High, or Critical).
   */
  high_priority:
    'priority in (Highest, High, Critical) AND resolution is EMPTY ORDER BY priority DESC, updated DESC',

  /**
   * Issues due within the next 7 days.
   */
  due_soon:
    'duedate >= now() AND duedate <= 7d AND resolution is EMPTY ORDER BY duedate ASC',

  /**
   * Issues created today.
   */
  created_today: 'created >= startOfDay() ORDER BY created DESC',

  /**
   * Issues updated today.
   */
  updated_today: 'updated >= startOfDay() ORDER BY updated DESC',
};

/**
 * Gets the JQL for a preset, optionally scoped to a project.
 *
 * @param preset - The preset name
 * @param projectKey - Optional project key to scope the search
 * @returns The JQL query string
 *
 * @example
 * const jql = getPresetJql('my_issues');
 * // Returns: 'assignee = currentUser() ORDER BY updated DESC'
 *
 * const jql = getPresetJql('my_issues', 'PROJ');
 * // Returns: 'project = PROJ AND assignee = currentUser() ORDER BY updated DESC'
 */
export function getPresetJql(
  preset: SearchPreset,
  projectKey?: string
): string {
  const baseJql = SEARCH_PRESETS[preset];

  if (!projectKey) {
    return baseJql;
  }

  // Insert project filter before ORDER BY
  const orderByIndex = baseJql.indexOf('ORDER BY');
  if (orderByIndex > 0) {
    const conditions = baseJql.substring(0, orderByIndex).trim();
    const orderBy = baseJql.substring(orderByIndex);
    return `project = ${projectKey} AND ${conditions} ${orderBy}`;
  }

  return `project = ${projectKey} AND ${baseJql}`;
}

/**
 * Builds a JQL query from preset or custom JQL.
 *
 * @param options - Query options
 * @returns The JQL query string
 */
export function buildSearchJql(options: {
  preset?: SearchPreset;
  jql?: string;
  projectKey?: string;
}): string {
  const { preset, jql, projectKey } = options;

  // Custom JQL takes precedence
  if (jql) {
    if (projectKey && !jql.toLowerCase().includes('project')) {
      // Add project filter if not already present
      const orderByIndex = jql.indexOf('ORDER BY');
      if (orderByIndex > 0) {
        const conditions = jql.substring(0, orderByIndex).trim();
        const orderBy = jql.substring(orderByIndex);
        return `project = ${projectKey} AND ${conditions} ${orderBy}`;
      }
      return `project = ${projectKey} AND ${jql}`;
    }
    return jql;
  }

  // Use preset
  if (preset) {
    return getPresetJql(preset, projectKey);
  }

  // Default: all issues for project or all projects
  if (projectKey) {
    return `project = ${projectKey} ORDER BY updated DESC`;
  }

  return 'ORDER BY updated DESC';
}

/**
 * Gets all available preset names with descriptions.
 */
export function getPresetDescriptions(): Array<{
  name: SearchPreset;
  description: string;
  jql: string;
}> {
  return [
    {
      name: 'my_issues',
      description: 'Issues assigned to you',
      jql: SEARCH_PRESETS.my_issues,
    },
    {
      name: 'current_sprint',
      description: 'All issues in active sprints',
      jql: SEARCH_PRESETS.current_sprint,
    },
    {
      name: 'my_sprint_issues',
      description: 'Your issues in active sprints',
      jql: SEARCH_PRESETS.my_sprint_issues,
    },
    {
      name: 'recently_updated',
      description: 'Issues updated in the last 7 days',
      jql: SEARCH_PRESETS.recently_updated,
    },
    {
      name: 'blocked',
      description: 'Blocked or flagged issues',
      jql: SEARCH_PRESETS.blocked,
    },
    {
      name: 'unassigned_sprint',
      description: 'Unassigned issues in active sprints',
      jql: SEARCH_PRESETS.unassigned_sprint,
    },
    {
      name: 'my_watching',
      description: 'Issues you are watching',
      jql: SEARCH_PRESETS.my_watching,
    },
    {
      name: 'my_reported',
      description: 'Issues you reported',
      jql: SEARCH_PRESETS.my_reported,
    },
    {
      name: 'high_priority',
      description: 'High priority unresolved issues',
      jql: SEARCH_PRESETS.high_priority,
    },
    {
      name: 'due_soon',
      description: 'Issues due within 7 days',
      jql: SEARCH_PRESETS.due_soon,
    },
    {
      name: 'created_today',
      description: 'Issues created today',
      jql: SEARCH_PRESETS.created_today,
    },
    {
      name: 'updated_today',
      description: 'Issues updated today',
      jql: SEARCH_PRESETS.updated_today,
    },
  ];
}
