# Tasks

## Versioning
- **v1.0**: Core MCP Server với Jira read/write tools

# -----------------------------------------------------------------------------------------------------
## v1.0 Tasks: Core MCP Server

### Task 1: Project setup và MCP Server boilerplate [Independent]
**Objective:** Khởi tạo project TypeScript với MCP Server chạy được qua stdio.
- [x] Tạo `package.json` với dependencies: `@modelcontextprotocol/sdk`, `axios`, `dotenv`, `zod`
- [x] Tạo `tsconfig.json` cấu hình TypeScript (target ES2022, module NodeNext)
- [x] Tạo `src/index.ts` — entrypoint khởi động MCP Server qua stdio transport
- [x] Tạo `src/server.ts` — setup MCP Server, đăng ký tool handlers
- [x] Tạo `.env.example` với `JIRA_BASE_URL` và `JIRA_TOKEN`
- [x] Tạo `.gitignore` (node_modules, dist, .env)
- [x] Verify: `npm run build` thành công, `node dist/index.js` khởi động không lỗi
Files: `package.json`, `tsconfig.json`, `src/index.ts`, `src/server.ts`, `.env.example`, `.gitignore`
**Demo:** Chạy `node dist/index.js` → server khởi động và chờ MCP connection qua stdio

### Task 2: Jira API Client [Independent]
**Objective:** Tạo HTTP client gọi Jira REST API v2 với Bearer token auth.
- [x] Tạo `src/jira-client.ts` với class `JiraClient`
- [x] Constructor nhận `baseUrl` và `token`, tạo axios instance với headers
- [x] Implement `searchIssues(jql, maxResults)` — POST `/rest/api/2/search` với pagination
- [x] Implement `getIssue(issueKey)` — GET `/rest/api/2/issue/{key}`
- [x] Implement `createIssue(fields)` — POST `/rest/api/2/issue`
- [x] Implement `updateIssue(issueKey, fields)` — PUT `/rest/api/2/issue/{key}`
- [x] Implement `transitionIssue(issueKey, transitionId)` — POST `/rest/api/2/issue/{key}/transitions`
- [x] Implement `getTransitions(issueKey)` — GET `/rest/api/2/issue/{key}/transitions`
- [x] Implement `addComment(issueKey, body)` — POST `/rest/api/2/issue/{key}/comment`
- [x] Error handling: parse Jira error messages, trả về message rõ ràng
Files: `src/jira-client.ts`
**Demo:** Unit test hoặc manual test gọi được Jira API, trả về data đúng

### Task 3: Tool `search_issues` [Depends on: Task 1, Task 2]
**Objective:** Đăng ký MCP tool cho phép AI agent tìm kiếm issues bằng JQL.
- [x] Tạo `src/tools/search.ts`
- [x] Định nghĩa tool schema với zod: `jql` (string, required), `maxResults` (number, optional, maximum 500)
- [x] Implement handler: gọi `JiraClient.searchIssues()`, format response
- [x] Response trả về: mỗi issue gồm key, summary, status, priority, assignee, assignee avatar URLs, issueType, attachments
- [x] Đăng ký tool trong `server.ts`
Files: `src/tools/search.ts`, `src/server.ts`
**Demo:** Từ Claude Code, gọi `search_issues` với JQL → nhận danh sách issues

### Task 4: Tool `get_issue` [Depends on: Task 1, Task 2]
**Objective:** Đăng ký MCP tool lấy chi tiết một issue.
- [x] Tạo `src/tools/get-issue.ts`
- [x] Định nghĩa tool schema: `issueKey` (string, required)
- [x] Implement handler: gọi `JiraClient.getIssue()`, format response đầy đủ
- [x] Response gồm: key, summary, description, issue type, status, priority, assignee, reporter, avatar URLs, created, updated, dueDate, fixVersions, attachments, comments, subtasks
- [x] Parse inline image names trong comment Jira wiki markup và map sang attachment metadata
- [x] Đăng ký tool trong `server.ts`
Files: `src/tools/get-issue.ts`, `src/server.ts`
**Demo:** Từ Claude Code, gọi `get_issue` với key "PROJ-123" → nhận chi tiết issue

### Task 5: Tool `create_issue` [Depends on: Task 1, Task 2]
**Objective:** Đăng ký MCP tool tạo issue mới trên Jira.
- [x] Tạo `src/tools/create-issue.ts`
- [x] Định nghĩa tool schema: `projectKey`, `issueType`, `summary` (required); `description`, `assignee`, `priority`, `parentKey` (optional)
- [x] Implement handler: build fields object, gọi `JiraClient.createIssue()`
- [x] Response trả về: key và self URL của issue mới
- [x] Đăng ký tool trong `server.ts`
Files: `src/tools/create-issue.ts`, `src/server.ts`
**Demo:** Từ Claude Code, gọi `create_issue` → issue mới xuất hiện trên Jira

### Task 6: Tool `update_issue` [Depends on: Task 1, Task 2]
**Objective:** Đăng ký MCP tool cập nhật fields của issue.
- [x] Tạo `src/tools/update-issue.ts`
- [x] Định nghĩa tool schema: `issueKey` (required), `summary`, `description`, `assignee`, `priority`, `dueDate`, `labels`, `fixVersions` (all optional)
- [x] Implement handler: build update payload, gọi `JiraClient.updateIssue()`
- [x] Response trả về confirmation message
- [x] Đăng ký tool trong `server.ts`
Files: `src/tools/update-issue.ts`, `src/server.ts`
**Demo:** Từ Claude Code, gọi `update_issue` → fields trên Jira được cập nhật

### Task 7: Tool `transition_issue` và `get_transitions` [Depends on: Task 1, Task 2]
**Objective:** Đăng ký MCP tools cho workflow transitions.
- [x] Tạo `src/tools/transition.ts`
- [x] Implement `get_transitions`: schema `issueKey` (required), trả về list {id, name, toStatus}
- [x] Implement `transition_issue`: schema `issueKey` + `transitionId` (required), thực hiện transition
- [x] Response trả về trạng thái mới sau transition
- [x] Đăng ký cả 2 tools trong `server.ts`
Files: `src/tools/transition.ts`, `src/server.ts`
**Demo:** Từ Claude Code, gọi `get_transitions` → xem danh sách, rồi `transition_issue` → chuyển trạng thái

### Task 8: Tool `add_comment` [Depends on: Task 1, Task 2]
**Objective:** Đăng ký MCP tool thêm comment vào issue.
- [x] Tạo `src/tools/comment.ts`
- [x] Định nghĩa tool schema: `issueKey` (required), `body` (string, required)
- [x] Implement handler: gọi `JiraClient.addComment()`
- [x] Response trả về comment ID và confirmation
- [x] Đăng ký tool trong `server.ts`
Files: `src/tools/comment.ts`, `src/server.ts`
**Demo:** Từ Claude Code, gọi `add_comment` → comment hiển thị trên Jira

### Task 9: Config validation và error handling [Depends on: Task 1]
**Objective:** Validate config khi khởi động và xử lý lỗi API gracefully.
- [x] Validate `JIRA_BASE_URL` và `JIRA_TOKEN` có giá trị khi server khởi động
- [x] Báo lỗi rõ ràng nếu thiếu config (exit với message hướng dẫn)
- [x] Xử lý Jira API errors: 401 (unauthorized), 403 (forbidden), 404 (not found), 400 (bad request)
- [x] Trả về error message dễ hiểu cho AI agent (không raw stack trace)
Files: `src/server.ts`, `src/jira-client.ts`
**Demo:** Chạy server thiếu env → hiển thị error message hướng dẫn cấu hình

### Task 9.1: Setup script và multi-client install [Depends on: Task 1]
**Objective:** Cung cấp script setup cài dependency, build, tạo env và đăng ký MCP server vào client configs.
- [x] Tạo `setup.sh` với install mode và `serve` mode
- [x] Hỗ trợ options: `--name`, `--clients`, `--skip-deps`, `--skip-build`, `--skip-env`, `--force-env`
- [x] Tạo hoặc giữ `.env`; chmod `600` khi tạo mới
- [x] Cấu hình Codex trong `~/.codex/config.toml`
- [x] Cấu hình Claude Code trong `~/.claude.json`
- [x] Cấu hình Antigravity trong `~/.gemini/antigravity/mcp_config.json`
- [x] Cấu hình Kiro trong `~/.kiro/settings/mcp.json`
- [x] Cấu hình OpenCode trong `~/.config/opencode/opencode.json`
Files: `setup.sh`, `README.md`
**Demo:** Chạy `./setup.sh --clients codex,claude` → client configs trỏ về `setup.sh serve`

### Task 10: End-to-end testing với Claude Code [Depends on: Task 3-9]
**Objective:** Verify toàn bộ flow hoạt động từ Claude Code đến Jira.
- [ ] Cấu hình MCP server trong Claude Code settings
- [ ] Test `search_issues` — tìm issues bằng JQL
- [ ] Test `get_issue` — xem chi tiết issue
- [ ] Test `create_issue` — tạo issue mới
- [ ] Test `update_issue` — cập nhật summary/description
- [ ] Test `get_transitions` + `transition_issue` — chuyển trạng thái
- [ ] Test `add_comment` — thêm comment
- [ ] Test error cases: invalid JQL, non-existent issue key, missing permissions
Files: N/A
**Demo:** Tất cả tools hoạt động đúng từ Claude Code với Jira instance thực

**Note:** Chưa thể verify Task 10 trong môi trường hiện tại vì không có Jira instance/config thực để kết nối end-to-end.
