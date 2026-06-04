# Jira MCP Server

MCP (Model Context Protocol) Server kết nối đến Jira Self-Hosted, cho phép các AI coding agent đọc và ghi task trực tiếp trên Jira.

## Supported Clients

- **Claude Code** (Anthropic)
- **Codex** (OpenAI)
- **Antigravity** (Google DeepMind)
- Bất kỳ MCP-compatible client nào

## Features

### Read

- Tìm kiếm issues bằng JQL query
- Xem chi tiết issue (summary, description, status, assignee, priority, comments...)
- Lấy danh sách transitions khả dụng cho issue

### Write

- Tạo issue mới (Task, Bug, Story, Sub-task...)
- Cập nhật fields của issue (summary, description, assignee, priority, due date...)
- Chuyển trạng thái issue (To Do → In Progress → Done...)
- Thêm comment vào issue

## Architecture

```
AI Agent (Claude Code / Codex / Antigravity)
    │
    │  MCP Protocol (stdio)
    ▼
┌──────────────┐
│  Jira MCP    │
│  Server      │
└──────┬───────┘
       │  REST API v2
       ▼
┌──────────────┐
│  Jira Server │
│  / Data Center│
└──────────────┘
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_issues` | Tìm kiếm issues bằng JQL query |
| `get_issue` | Lấy chi tiết một issue theo key |
| `create_issue` | Tạo issue mới |
| `update_issue` | Cập nhật fields của issue |
| `transition_issue` | Chuyển trạng thái issue |
| `add_comment` | Thêm comment vào issue |
| `get_transitions` | Lấy danh sách transitions khả dụng |

## Prerequisites

- Jira Server hoặc Data Center instance (self-hosted)
- Personal Access Token (PAT) hoặc Bearer token có quyền truy cập REST API
- Node.js >= 18

## Installation

```bash
git clone <repository-url>
cd jira-mcp
npm install
npm run build
```

## Configuration

Tạo file `.env` từ template:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `JIRA_BASE_URL` | URL Jira instance (required) | - |
| `JIRA_TOKEN` | Bearer authentication token (required) | - |
| `JIRA_JQL` | Default JQL query cho search | `assignee = currentUser() AND resolution = Unresolved` |

## Client Setup

### Claude Code

Thêm vào `~/.claude/settings.json` hoặc `.claude/settings.json` trong project:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["path/to/jira-mcp/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-jira.company.com",
        "JIRA_TOKEN": "your-token"
      }
    }
  }
}
```

### Codex

Thêm vào cấu hình MCP của Codex:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["path/to/jira-mcp/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-jira.company.com",
        "JIRA_TOKEN": "your-token"
      }
    }
  }
}
```

### Antigravity

Cấu hình MCP server tương tự, theo hướng dẫn của Antigravity client.

## Local Verification

Build project:

```bash
npm run build
```

Start the MCP server with environment variables:

```bash
JIRA_BASE_URL=https://your-jira.company.com \
JIRA_TOKEN=your-token \
node dist/index.js
```

Nếu thiếu config, server sẽ exit với message hướng dẫn rõ ràng thay vì in raw stack trace.

## Tech Stack

- TypeScript
- `@modelcontextprotocol/sdk` - MCP protocol SDK
- `axios` - HTTP client cho Jira REST API

## License

MIT
