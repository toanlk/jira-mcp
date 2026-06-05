# PRD: Jira MCP Server

## Versioning
- **v1.0**: Core MCP Server với Jira read/write tools

# -----------------------------------------------------------------------------------------------------
## v1.0: Core MCP Server

### Summary
Xây dựng MCP Server cho phép các AI coding agent (Claude Code, Codex, Antigravity, Kiro, OpenCode) kết nối đến Jira Self-Hosted (Server/Data Center) để đọc và ghi task. Server expose các tools qua MCP protocol (stdio transport), gọi Jira REST API v2 với Bearer token authentication.

### Goals
- MCP Server hoạt động ổn định qua stdio transport
- Đọc issues từ Jira: search bằng JQL, xem chi tiết issue
- Ghi issues lên Jira: tạo mới, cập nhật fields, chuyển trạng thái, thêm comment
- Cấu hình đơn giản qua environment variables
- Tương thích với Claude Code, Codex, Antigravity, Kiro, OpenCode và mọi MCP-compatible client

### Non-Goals
- Hỗ trợ Jira Cloud (chỉ Self-Hosted Server/Data Center)
- OAuth authentication (chỉ Bearer token/PAT)
- Webhook / real-time notifications từ Jira
- UI hoặc web dashboard
- Caching hoặc local persistence
- Batch operations (bulk create/update)

### Architecture
```
AI Agent (Claude Code / Codex / Antigravity)
    │
    │  MCP Protocol (stdio)
    ▼
┌────────────────────────────────┐
│  MCP Server (TypeScript)       │
│  ├─ index.ts      (entrypoint) │
│  ├─ server.ts     (MCP setup)  │
│  ├─ jira-client.ts(API client) │
│  └─ tools/                     │
│     ├─ search.ts               │
│     ├─ get-issue.ts            │
│     ├─ create-issue.ts         │
│     ├─ update-issue.ts         │
│     ├─ transition.ts           │
│     └─ comment.ts              │
└────────────────┬───────────────┘
                 │  REST API v2 (Bearer token)
                 ▼
┌────────────────────────────────┐
│  Jira Server / Data Center     │
└────────────────────────────────┘
```

### Functional Requirements

#### 1. MCP Server Setup
1. Khởi tạo MCP Server sử dụng `@modelcontextprotocol/sdk`
2. Sử dụng stdio transport (stdin/stdout)
3. Đọc config từ environment variables: `JIRA_BASE_URL`, `JIRA_TOKEN`
4. Validate config khi khởi động, báo lỗi rõ ràng nếu thiếu

#### 2. Jira API Client
1. HTTP client gọi Jira REST API v2
2. Bearer token authentication qua header `Authorization: Bearer <token>`
3. JSON request/response
4. Xử lý pagination cho search results; mỗi request Jira tối đa 100 issues, tool-level `maxResults` tối đa 500
5. Error handling: trả về message rõ ràng khi API lỗi (400, 401, 403, 404, 5xx), timeout hoặc lỗi network

#### 3. Tool: `search_issues`
1. Input: `jql` (string, required), `maxResults` (number, optional, default 50, maximum 500)
2. Gọi `POST /rest/api/2/search` với JQL query
3. Trả về danh sách issues: key, summary, status, priority, assignee, assignee avatar URLs, issue type, attachment metadata
4. Hỗ trợ pagination nếu kết quả vượt maxResults

#### 4. Tool: `get_issue`
1. Input: `issueKey` (string, required, e.g. "PROJ-123")
2. Gọi `GET /rest/api/2/issue/{issueKey}`
3. Trả về chi tiết: key, summary, description, issue type, status, priority, assignee, reporter, avatar URLs, created, updated, due date, fix versions, attachments, comments, subtasks
4. Với comments, parse inline image syntax dạng `!filename.png!` và map sang attachment metadata nếu attachment tồn tại trên issue

#### 5. Tool: `create_issue`
1. Input: `projectKey` (string, required), `issueType` (string, required), `summary` (string, required), `description` (string, optional), `assignee` (string, optional), `priority` (string, optional), `parentKey` (string, optional cho sub-task)
2. Gọi `POST /rest/api/2/issue`
3. Trả về key và URL của issue mới tạo

#### 6. Tool: `update_issue`
1. Input: `issueKey` (string, required), cùng các field optional cần cập nhật: `summary`, `description`, `assignee`, `priority`, `dueDate`, `labels`, `fixVersions`
2. Hỗ trợ update: summary, description, assignee, priority, due date, labels, fix versions
3. Gọi `PUT /rest/api/2/issue/{issueKey}`
4. Validate có ít nhất một field cần update và trả về confirmation

#### 7. Tool: `transition_issue`
1. Input: `issueKey` (string, required), `transitionId` (string, required)
2. Gọi `POST /rest/api/2/issue/{issueKey}/transitions`
3. Trả về confirmation với trạng thái mới

#### 8. Tool: `get_transitions`
1. Input: `issueKey` (string, required)
2. Gọi `GET /rest/api/2/issue/{issueKey}/transitions`
3. Trả về danh sách transitions khả dụng: id, name, to status

#### 9. Tool: `add_comment`
1. Input: `issueKey` (string, required), `body` (string, required)
2. Gọi `POST /rest/api/2/issue/{issueKey}/comment`
3. Trả về confirmation với comment ID

### Acceptance Criteria
- Server khởi động thành công và kết nối được từ Claude Code
- `search_issues` với JQL trả về danh sách issues đúng
- `get_issue` trả về đầy đủ thông tin issue
- `create_issue` tạo issue mới trên Jira thành công
- `update_issue` cập nhật fields đúng
- `transition_issue` chuyển trạng thái thành công
- `add_comment` thêm comment hiển thị đúng trên Jira
- Server báo lỗi rõ ràng khi thiếu config hoặc API lỗi
- `search_issues` và `get_issue` trả về attachment/avatar metadata khi Jira response có dữ liệu tương ứng
- `setup.sh` cấu hình được Codex, Claude Code, Antigravity, Kiro và OpenCode

### Dependencies
- `@modelcontextprotocol/sdk` — MCP protocol implementation
- `axios` — HTTP client
- `dotenv` — Environment variable loading
- `typescript` — Language
- `zod` — Input validation cho tool parameters
