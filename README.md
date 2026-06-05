# Jira MCP Server

MCP (Model Context Protocol) Server kết nối đến Jira Self-Hosted, cho phép các AI coding agent đọc và ghi task trực tiếp trên Jira.

## Supported Clients

- **Claude Code** (Anthropic)
- **Codex** (OpenAI)
- **Antigravity** (Google DeepMind)
- **Kiro**
- **OpenCode**
- Bất kỳ MCP-compatible client nào

## Features

### Read

- Tìm kiếm issues bằng JQL query
- Xem chi tiết issue (summary, description, status, assignee, priority, comments...)
- Đọc metadata attachment, avatar và inline image được tham chiếu trong comment Jira wiki markup
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

## Tool Inputs

### `search_issues`

Input:

- `jql` (string, required)
- `maxResults` (number, optional, default `50`, maximum `500`)

Notes:

- Server phân trang qua Jira REST API và request mỗi page tối đa 100 issues.
- Response gồm `total`, `returned`, và danh sách issue với key, summary, status, priority, assignee, assignee avatar URLs, issue type và attachment metadata.

### `get_issue`

Input:

- `issueKey` (string, required), ví dụ `PROJ-123`

Response gồm key, summary, description, issue type, status, priority, assignee, reporter, avatar URLs, created/updated, due date, fix versions, attachments, comments và subtasks.

Attachment payload gồm `id`, `filename`, `mimeType`, `size`, `contentUrl`, `thumbnailUrl`, `created`, `author`, `authorAvatarUrls`.

Comment payload gồm body, author metadata, timestamps, `inlineImageNames`, và `inlineImages` nếu comment dùng Jira wiki markup dạng `!filename.png!` trỏ tới attachment cùng issue.

### `create_issue`

Input:

- `projectKey` (string, required)
- `issueType` (string, required)
- `summary` (string, required)
- `description` (string, optional)
- `assignee` (string, optional; mapped to Jira user `name`)
- `priority` (string, optional; mapped to priority `name`)
- `parentKey` (string, optional; dùng cho sub-task)

### `update_issue`

Input:

- `issueKey` (string, required)
- `summary`, `description`, `assignee`, `priority`, `dueDate` (optional)
- `labels`, `fixVersions` (string array, optional)

At least one editable field must be provided. `fixVersions` được gửi theo Jira version `name`.

### `get_transitions`

Input:

- `issueKey` (string, required)

Response gồm danh sách `{ id, name, toStatus }`.

### `transition_issue`

Input:

- `issueKey` (string, required)
- `transitionId` (string, required)

Sau khi transition, server đọc lại issue và trả về status mới.

### `add_comment`

Input:

- `issueKey` (string, required)
- `body` (string, required)

## Prerequisites

- Jira Server hoặc Data Center instance (self-hosted)
- Personal Access Token (PAT) hoặc Bearer token có quyền truy cập REST API
- Node.js >= 18

## Installation

```bash
git clone <repository-url>
cd jira-mcp
./setup.sh
```

## Configuration

`setup.sh` sẽ:

- Cài dependencies bằng `npm install`
- Build server bằng `npm run build`
- Tạo hoặc giữ lại file `.env` tại root project
- Cấu hình MCP server `jira` vào:
  - Codex: `~/.codex/config.toml`
  - Claude Code: `~/.claude.json`
  - Antigravity: `~/.gemini/antigravity/mcp_config.json`
  - Kiro: `~/.kiro/settings/mcp.json`
  - OpenCode: `~/.config/opencode/opencode.json`

Nếu chạy interactive, script sẽ hỏi:

- `JIRA_BASE_URL`
- `JIRA_TOKEN`

Hoặc có thể truyền trước qua environment:

```bash
JIRA_BASE_URL=https://your-jira.company.com \
JIRA_TOKEN=your-token \
./setup.sh
```

Một vài option hữu ích:

```bash
./setup.sh --clients codex,claude
./setup.sh --name jira-company
./setup.sh --skip-deps --skip-build --skip-env
./setup.sh --force-env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `JIRA_BASE_URL` | URL Jira instance (required) | - |
| `JIRA_TOKEN` | Bearer authentication token (required) | - |

`.env` được tạo với permission `600`. Nếu `.env` đã tồn tại, `setup.sh` giữ nguyên nội dung trừ khi dùng `--force-env`.

## Client Setup

### Claude Code
Chạy `./setup.sh` để tự động thêm config user-level vào `~/.claude.json`.

### Codex
Chạy `./setup.sh` để tự động thêm config vào `~/.codex/config.toml`.

### Antigravity

Chạy `./setup.sh` để tự động thêm config vào `~/.gemini/antigravity/mcp_config.json`.

### Kiro

Chạy `./setup.sh` để tự động thêm config vào `~/.kiro/settings/mcp.json`.

### OpenCode

Chạy `./setup.sh` để tự động thêm config vào `~/.config/opencode/opencode.json`.

## Local Verification

Start the MCP server through the shared launcher:

```bash
./setup.sh serve
```

Nếu thiếu config, server sẽ exit với message hướng dẫn rõ ràng thay vì in raw stack trace.

Build TypeScript:

```bash
npm run build
```

Chạy trực tiếp sau khi build:

```bash
npm start
```

## Tech Stack

- TypeScript
- `@modelcontextprotocol/sdk` - MCP protocol SDK
- `axios` - HTTP client cho Jira REST API

## License

MIT
