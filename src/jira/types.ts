/**
 * Jira API type definitions.
 * Based on Jira Cloud REST API v3.
 * @module jira/types
 */

/**
 * Jira user representation.
 */
export interface JiraUser {
  accountId: string;
  accountType?: string;
  emailAddress?: string;
  displayName: string;
  active: boolean;
  avatarUrls?: Record<string, string>;
  self?: string;
  timeZone?: string;
}

/**
 * Jira project representation.
 */
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: JiraUser;
  projectTypeKey?: string;
  simplified?: boolean;
  style?: string;
  avatarUrls?: Record<string, string>;
  self?: string;
}

/**
 * Jira issue type representation.
 */
export interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  subtask: boolean;
  self?: string;
}

/**
 * Jira priority representation.
 */
export interface JiraPriority {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  self?: string;
}

/**
 * Jira status representation.
 */
export interface JiraStatus {
  id: string;
  name: string;
  description?: string;
  statusCategory?: {
    id: number;
    key: string;
    name: string;
    colorName: string;
  };
  self?: string;
}

/**
 * Jira issue fields.
 */
export interface JiraIssueFields {
  summary: string;
  description?: string | JiraDocument;
  issuetype: JiraIssueType;
  project: JiraProject;
  status: JiraStatus;
  priority?: JiraPriority;
  assignee?: JiraUser | null;
  reporter?: JiraUser;
  creator?: JiraUser;
  created?: string;
  updated?: string;
  resolutiondate?: string | null;
  duedate?: string | null;
  labels?: string[];
  components?: Array<{ id: string; name: string }>;
  fixVersions?: Array<{ id: string; name: string }>;
  parent?: { id: string; key: string };
  subtasks?: JiraIssue[];
  comment?: {
    comments: JiraComment[];
    total: number;
  };
  worklog?: {
    worklogs: JiraWorklog[];
    total: number;
  };
  attachment?: JiraAttachment[];
  [key: string]: unknown;
}

/**
 * Jira Atlassian Document Format (ADF).
 */
export interface JiraDocument {
  type: 'doc';
  version: 1;
  content: JiraDocumentNode[];
}

export interface JiraDocumentNode {
  type: string;
  content?: JiraDocumentNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Jira issue representation.
 */
export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
  changelog?: {
    histories: JiraChangelogHistory[];
  };
  transitions?: JiraTransition[];
}

/**
 * Jira changelog history.
 */
export interface JiraChangelogHistory {
  id: string;
  author: JiraUser;
  created: string;
  items: Array<{
    field: string;
    fieldtype: string;
    from: string | null;
    fromString: string | null;
    to: string | null;
    toString: string | null;
  }>;
}

/**
 * Jira transition representation.
 */
export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  hasScreen?: boolean;
  isGlobal?: boolean;
  isInitial?: boolean;
  isAvailable?: boolean;
  isConditional?: boolean;
  isLooped?: boolean;
}

/**
 * Jira comment representation.
 */
export interface JiraComment {
  id: string;
  self: string;
  author: JiraUser;
  body: string | JiraDocument;
  created: string;
  updated: string;
  updateAuthor?: JiraUser;
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
}

/**
 * Jira worklog representation.
 */
export interface JiraWorklog {
  id: string;
  self: string;
  author: JiraUser;
  updateAuthor?: JiraUser;
  comment?: string | JiraDocument;
  created: string;
  updated: string;
  started: string;
  timeSpent: string;
  timeSpentSeconds: number;
  issueId?: string;
}

/**
 * Jira attachment representation.
 */
export interface JiraAttachment {
  id: string;
  self: string;
  filename: string;
  author: JiraUser;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}

/**
 * Jira board representation.
 */
export interface JiraBoard {
  id: number;
  name: string;
  type: 'scrum' | 'kanban' | 'simple';
  self: string;
  location?: {
    projectId?: number;
    projectKey?: string;
    projectName?: string;
    displayName?: string;
  };
}

/**
 * Jira sprint representation.
 */
export interface JiraSprint {
  id: number;
  name: string;
  state: 'future' | 'active' | 'closed';
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId?: number;
  goal?: string;
  self?: string;
}

/**
 * Input for creating an issue.
 */
export interface CreateIssueInput {
  projectKey: string;
  summary: string;
  issueType: string;
  description?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  components?: string[];
  parentKey?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Input for updating an issue.
 */
export interface UpdateIssueInput {
  summary?: string;
  description?: string;
  priority?: string;
  assignee?: string | null;
  labels?: string[];
  components?: string[];
  customFields?: Record<string, unknown>;
}

/**
 * JQL search parameters.
 * Updated for the new /rest/api/3/search/jql endpoint.
 */
export interface JqlSearchParams {
  jql: string;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
  /** Token for pagination (replaces startAt in new API) */
  nextPageToken?: string;
}

/**
 * JQL search response.
 * Updated for the new /rest/api/3/search/jql endpoint.
 */
export interface JqlSearchResponse {
  issues: JiraIssue[];
  /** Token for fetching the next page of results */
  nextPageToken?: string;
  /** Total number of results (may not always be present in new API) */
  total?: number;
  /** Maximum results per page */
  maxResults?: number;
}
