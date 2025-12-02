# Jira MCP

[![npm version](https://img.shields.io/npm/v/@icy-r/jira-mcp.svg)](https://www.npmjs.com/package/@icy-r/jira-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for Jira Cloud. Enables AI assistants to manage issues, sprints, projects, and more.

## Quick Start

```bash
npx @icy-r/jira-mcp
```

## MCP Configuration

Add to your MCP client (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@icy-r/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**Get your API token:** [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JIRA_BASE_URL` | Jira instance URL | Yes |
| `JIRA_EMAIL` | Your Atlassian email | Yes |
| `JIRA_API_TOKEN` | API token | Yes |
| `JIRA_MCP_USE_TOON` | Enable TOON format | No |

## Tools

| Tool | Actions |
|------|---------|
| `jira_issues` | get, create, update, delete, search, transition, assign |
| `jira_projects` | list, get, get_statuses, get_versions, create_version |
| `jira_sprints` | list, get, get_issues, get_active, create, update |
| `jira_boards` | list, get, get_config, get_issues, get_backlog |
| `jira_comments` | list, get, add, update, delete |
| `jira_links` | get_link_types, list, create, remove |
| `jira_worklogs` | list, add, update, delete |
| `jira_users` | get_current, get, search, get_assignable |
| `jira_fields` | list, list_custom, search, get_id |
| `jira_audit` | get_status, set_dry_run, get_session_log |

## Search Presets

```json
{ "action": "search", "preset": "my_sprint_issues" }
```

Available: `my_issues`, `current_sprint`, `my_sprint_issues`, `recently_updated`, `high_priority`, `due_soon`

## Safety Features

Destructive actions require confirmation:

```json
{ "action": "delete", "issueKey": "PROJ-123", "confirm": true }
```

Preview changes with dry-run:

```json
{ "action": "update", "issueKey": "PROJ-123", "summary": "New title", "dryRun": true }
```

## Development

```bash
git clone https://github.com/icy-r/jira-mcp.git
cd jira-mcp
pnpm install
pnpm build
pnpm test
```

## License

MIT
