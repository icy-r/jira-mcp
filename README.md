# Jira MCP Server

[![CI](https://github.com/icy-r/jira-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/icy-r/jira-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@icy-r/jira-mcp.svg)](https://www.npmjs.com/package/@icy-r/jira-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that enables AI assistants to interact with Jira Cloud via REST API. Built with TypeScript, featuring optimized responses using TOON format for reduced token usage.

## Features

- **Consolidated Tools**: 10 action-based tools instead of 28+ individual tools for better AI agent understanding
- **Safety Features**: Audit logging, dry-run mode, and confirmation requirements for destructive actions
- **Data Minimization**: Default minimal fields with optional `full` parameter for complete data
- **Search Presets**: Built-in JQL presets for common queries (my_issues, current_sprint, etc.)
- **Board Auto-Detection**: Automatically detects board ID from project key
- **Custom Field Discovery**: Automatic discovery and caching of custom fields
- **Token Optimization**: TOON format reduces token usage by 30-60%
- **API Compatibility**: Updated for Jira Cloud API changes (May 2025 search migration, Epic Link deprecation)
- **Rate Limiting**: Built-in rate limiter respects Jira API limits
- **Comprehensive Error Handling**: Detailed error messages and proper error types

## Prerequisites

- Node.js 20.0.0 or higher
- pnpm (recommended) or npm
- Jira Cloud instance with API access
- Jira API token ([How to create](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/))

## Installation

```bash
npm install @icy-r/jira-mcp
```

Or run directly with npx:

```bash
npx @icy-r/jira-mcp
```

### From Source

```bash
# Clone the repository
git clone https://github.com/icy-r/jira-mcp.git
cd jira-mcp

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Configuration

Create a `.env` file in the project root (or set environment variables):

```bash
# Required
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Optional
JIRA_MCP_LOG_LEVEL=info        # debug, info, warn, error
JIRA_MCP_RATE_LIMIT=100        # requests per minute
JIRA_MCP_USE_TOON=true         # enable TOON format optimization
JIRA_MCP_TOON_DELIMITER=,      # delimiter for TOON arrays
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-mcp/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

### With Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["D:/path/to/jira-mcp/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

### Development Mode

```bash
# Run with tsx for development
pnpm dev
```

## Consolidated Tools (v2.0)

The server provides 9 consolidated action-based tools for better AI agent understanding:

### jira_issues

Manage Jira issues with all CRUD operations.

| Action            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `get`             | Get issue details (use `full=true` for all fields) |
| `create`          | Create a new issue                                 |
| `update`          | Update issue fields                                |
| `delete`          | Delete an issue                                    |
| `search`          | Search with JQL or preset queries                  |
| `transition`      | Change issue status                                |
| `assign`          | Assign/unassign issue                              |
| `get_transitions` | Get available status transitions                   |
| `link_to_epic`    | Link/unlink issue to epic                          |
| `get_changelog`   | Get issue change history                           |

**Search Presets:**

- `my_issues` - Issues assigned to you
- `current_sprint` - All issues in active sprints
- `my_sprint_issues` - Your issues in active sprints
- `recently_updated` - Issues updated in last 7 days
- `blocked` - Blocked or flagged issues
- `unassigned_sprint` - Unassigned issues in active sprints
- `high_priority` - High priority unresolved issues
- `due_soon` - Issues due within 7 days

### jira_projects

Manage projects and versions.

| Action                  | Description                          |
| ----------------------- | ------------------------------------ |
| `list`                  | List all accessible projects         |
| `get`                   | Get project details                  |
| `get_statuses`          | Get available statuses by issue type |
| `get_components`        | Get project components               |
| `get_versions`          | Get project versions/releases        |
| `create_version`        | Create a new version                 |
| `batch_create_versions` | Create multiple versions             |
| `update_version`        | Update version details               |
| `release_version`       | Mark version as released             |

### jira_sprints

Manage sprints with auto board detection.

| Action        | Description                    |
| ------------- | ------------------------------ |
| `list`        | List sprints (filter by state) |
| `get`         | Get sprint details             |
| `get_issues`  | Get issues in a sprint         |
| `get_active`  | Get currently active sprint    |
| `create`      | Create a new sprint            |
| `update`      | Update sprint details          |
| `move_issues` | Move issues to a sprint        |

**Note:** Board ID is auto-detected from `projectKey` if not provided.

### jira_boards

Manage Jira boards.

| Action        | Description                          |
| ------------- | ------------------------------------ |
| `list`        | List boards (filter by project/type) |
| `get`         | Get board details                    |
| `get_config`  | Get board configuration              |
| `get_issues`  | Get issues in active sprint          |
| `get_backlog` | Get backlog issues                   |

### jira_comments

Manage issue comments.

| Action   | Description               |
| -------- | ------------------------- |
| `list`   | List comments on an issue |
| `get`    | Get a specific comment    |
| `add`    | Add a new comment         |
| `update` | Update comment body       |
| `delete` | Delete a comment          |

### jira_links

Manage issue links and remote links.

| Action           | Description                |
| ---------------- | -------------------------- |
| `get_link_types` | Get available link types   |
| `list`           | List links for an issue    |
| `create`         | Create link between issues |
| `remove`         | Remove an issue link       |
| `link_to_epic`   | Link/unlink to epic        |
| `list_remote`    | List remote/web links      |
| `create_remote`  | Add a remote link          |
| `remove_remote`  | Remove a remote link       |

### jira_worklogs

Time tracking / worklogs.

| Action   | Description                |
| -------- | -------------------------- |
| `list`   | List worklogs for an issue |
| `add`    | Log time spent             |
| `update` | Update a worklog entry     |
| `delete` | Remove a worklog           |

### jira_users

User management.

| Action           | Description                |
| ---------------- | -------------------------- |
| `get_current`    | Get authenticated user     |
| `get`            | Get user by account ID     |
| `search`         | Search users by name/email |
| `get_assignable` | Get assignable users       |

### jira_fields

Field discovery.

| Action        | Description                 |
| ------------- | --------------------------- |
| `list`        | List all available fields   |
| `list_custom` | List only custom fields     |
| `search`      | Search fields by name       |
| `get_id`      | Get field ID by name        |
| `get_common`  | Get common custom field IDs |
| `suggest`     | Get field suggestions       |
| `clear_cache` | Clear fields cache          |

### jira_audit

Audit logging and safety controls.

| Action            | Description                             |
| ----------------- | --------------------------------------- |
| `get_status`      | Check dry-run mode and session stats    |
| `set_dry_run`     | Enable/disable dry-run mode             |
| `get_session_log` | View changes made in this session       |
| `get_recent_log`  | View recent entries from audit log file |
| `clear_session`   | Clear session audit log                 |
| `configure`       | Update audit settings                   |

## Safety Features

The server includes built-in safeguards to prevent accidental destructive changes:

### Dry-Run Mode

Preview changes without executing them:

```json
{
  "action": "update",
  "issueKey": "PROJ-123",
  "summary": "New title",
  "dryRun": true
}
```

Output shows exactly what WOULD happen:

```
═══════════════════════════════════════════════════════════
  🔍 DRY-RUN MODE - No changes will be made
═══════════════════════════════════════════════════════════

  Action:   UPDATE
  Resource: issue
  Target:   PROJ-123

  Proposed Changes:
    • summary: "New title"

═══════════════════════════════════════════════════════════
```

### Confirmation Requirement

Destructive actions (update, delete) require explicit confirmation:

```json
{
  "action": "delete",
  "issueKey": "PROJ-123",
  "confirm": true
}
```

Without `confirm: true`, the operation returns an error prompting for confirmation.

### Audit Logging

All write operations are logged with:

- Timestamp
- Action type (create, update, delete, transition, etc.)
- Resource and ID
- Input parameters
- Result (success, failure, dry-run)
- Error messages (if any)

View the session log:

```json
{
  "action": "get_session_log"
}
```

### Global Dry-Run Mode

Enable dry-run mode for all operations:

```json
{
  "action": "set_dry_run",
  "enabled": true
}
```

This is useful for testing prompts or exploring what changes would be made.

## Example Usage

### Search for my issues in current sprint

```
Show me my issues in the current sprint
```

The AI will use:

```json
{
  "action": "search",
  "preset": "my_sprint_issues"
}
```

### Create an issue

```
Create a new bug in PROJ titled "Login button not working" with high priority
```

### Get sprint issues with auto board detection

```
Show me issues in the active sprint for project PROJ
```

The AI will automatically detect the board from the project.

### Link issues

```
Link PROJ-123 to PROJ-456 as "blocks"
```

## TOON Format Optimization

This server uses [TOON (Token-Oriented Object Notation)](https://github.com/toon-format/toon) to reduce token usage in responses. TOON provides 30-60% token reduction compared to JSON while remaining human-readable.

Example TOON output for issues:

```
issues[3]{key,summary,status,assignee}:
  PROJ-1,Fix login bug,In Progress,Alice
  PROJ-2,Add dark mode,Open,Bob
  PROJ-3,Update docs,Done,Unassigned
```

Use `full=true` parameter to get complete JSON data when needed.

## Development

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck
```

## Project Structure

```
jira-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── config/               # Configuration
│   ├── jira/                 # Jira API client
│   │   ├── client.ts         # HTTP client
│   │   ├── types.ts          # Type definitions
│   │   └── endpoints/        # API endpoints
│   │       ├── issues.ts     # Issue operations
│   │       ├── projects.ts   # Project operations
│   │       ├── sprints.ts    # Sprint operations
│   │       ├── boards.ts     # Board operations
│   │       ├── comments.ts   # Comment operations
│   │       ├── worklogs.ts   # Worklog operations
│   │       ├── users.ts      # User operations
│   │       ├── links.ts      # Issue linking
│   │       ├── versions.ts   # Version management
│   │       └── fields.ts     # Field discovery
│   ├── tools/                # MCP tools
│   │   ├── consolidated/     # Consolidated action-based tools
│   │   └── presets.ts        # JQL search presets
│   ├── formatters/           # Response formatters
│   │   ├── toon.ts           # TOON integration
│   │   └── response.ts       # Response utilities
│   ├── utils/                # Utilities
│   │   ├── errors.ts         # Error classes
│   │   ├── logger.ts         # Logging
│   │   ├── rate-limiter.ts   # Rate limiting
│   │   ├── pagination.ts     # Pagination helpers
│   │   ├── adf.ts            # ADF/Markdown conversion
│   │   ├── board-resolver.ts # Board auto-detection
│   │   └── audit.ts          # Audit logging & safety
│   └── types/                # Type definitions
├── tests/                    # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## API Compatibility

This server is updated for the latest Jira Cloud API changes:

- **Search API Migration (May 2025)**: Uses new `/rest/api/3/search/jql` endpoint with `nextPageToken` pagination
- **Epic Link Deprecation (Sept 2025)**: Uses `parent` field instead of Epic Link custom field
- **ADF Support**: Proper handling of Atlassian Document Format for descriptions and comments

## Error Handling

The server provides detailed error messages for common issues:

- **Authentication errors**: Invalid credentials or expired tokens
- **Rate limiting**: Automatic retry with backoff
- **Validation errors**: Clear field-level error messages
- **API errors**: Jira API error messages are preserved

## Security

- API tokens are never logged or exposed
- Sensitive data is automatically redacted from logs
- Basic auth credentials are properly encoded
- Environment variables are validated on startup

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.

## Support

- [Jira Cloud REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [TOON Format](https://github.com/toon-format/toon)
