# Plan: topic-inspiration

> 实现计划，由 design.md + tasks.md 驱动。完成 `/opsx:archive` 归档后 merge 回 `version/v0.1`。

---

## 0. 前置检查

- 当前分支：`feature/topic-inspiration`（父分支 `version/v0.1`）
- 依赖就绪：`setup-project-scaffold`（Hono/SQLite）+ `integrate-pi-agent`（AgentService.ask）已 merge 到 version/v0.1
- AgentService 已支持 `ask(message, opts?)`，opts.tools 可传空数组绕过默认 echo 工具

## 1. 执行顺序（11 步）

### Step 1 — DB schema 追加两表

**修改 `backend/src/db/schema.sql`**：在末尾追加 `imported_videos` 和 `channel_config` 建表语句（见 design 第 1 节）。用 `CREATE TABLE IF NOT EXISTS`，重启不报错。

**自检：** 启动后端，`sqlite3 backend/data/app.db ".tables"` 见 5 张表（topics/copies/copy_versions + imported_videos/channel_config）。

### Step 2 — `topic/repo.ts`

**创建 `backend/src/topic/repo.ts`**。封装三表操作：
- `listTopics({ status?, page, pageSize })` / `createTopic({ seed, title, rationale })` / `updateTopicStatus(id, status)`
- `listImportedVideos()` / `insertImportedVideos(rows)` / `clearImportedVideos()`
- `getChannelDescription()` / `setChannelDescription(value)`

用 `better-sqlite3` 同步 API + prepared statements。`status` 校验在 repo 层做（非 pending/adopted/discarded 抛错）。

**自检：** `npx tsc --noEmit` 通过。

### Step 3 — `topic/prompt.ts`

**创建 `backend/src/topic/prompt.ts`**。导出 `buildGeneratePrompt({ seeds, count, channelDescription, historyVideos })`，返回构造好的 prompt 字符串（见 design 第 3 节模板）。

历史视频取 top 30（按 views DESC），格式 `1. {title} ({views} 次播放)`，views 为 null 时显示 `(播放量未知)`。

**自检：** tsc 通过。

### Step 4 — `topic/generate.ts`

**创建 `backend/src/topic/generate.ts`**。导出 `generateTopics({ seeds, count })`：
1. 读 channelDescription + historyVideos
2. `buildGeneratePrompt(...)`
3. `await ask(prompt, { tools: [] })` — **关键**：传空 tools 数组，避免 echo 工具干扰 JSON 输出
4. strip markdown 代码块（`/^```json?\n?/m` ... `\n?```$/m`）
5. `JSON.parse(text)` — 失败抛 `TopicGenerateError`（含原始文本）
6. 校验每条有 title + rationale
7. 批量 `createTopic`，seed 用 `;` 连接
8. 返回新创建的选题列表

**自检：** tsc 通过。

### Step 5 — `topic/import.ts`

**创建 `backend/src/topic/import.ts`**。导出 `parseImportText(text)` 和 `parseImportFile(buffer)`：
- 共用 `parseLines(lines)`：每行 split `,`，strip 引号和空白
  - 首行若为 `title,views`（不区分大小写）跳过
  - 1 列：`{ title, views: null }`
  - 2 列：title + views（views 非数字时 views=null，保留 title，记入 skipped 计数）
  - >2 列：整行跳过，skipped++
- `parseImportFile` 先 `buffer.toString('utf-8')` 再走 `parseLines`

返回 `{ rows, skipped }`，写库由 repo 层做。

**自检：** tsc 通过。

### Step 6 — `routes/topic.ts`（选题路由）

**创建 `backend/src/routes/topic.ts`**：
- `POST /generate`：校验 seeds 非空 → 调 `generateTopics` → 返回；catch LLM 错误转 503，JSON 解析错误转 502
- `GET /`：解析 query `status/page/pageSize` → `listTopics` → 返回分页结构
- `PATCH /:id`：校验 status 合法 → `updateTopicStatus`；404 处理

挂载点：`new Hono().basePath('/api/v1').route('/topics', topicRouter)`。

**自检：** tsc + 启动后端，`curl POST /api/v1/topics/generate -d '{"seeds":[]}'` 返回 400。

### Step 7 — `routes/topic.ts`（导入与配置路由）

同文件追加：
- `POST /import`：判断 content-type；multipart 用 Hono 的 `c.req.parseBody()` 取 file → buffer → `parseImportFile`；json 取 `text` → `parseImportText`；批量 `insertImportedVideos` → 返回 `{ imported, skipped }`
- `GET /imported-videos` + `DELETE /imported-videos`
- `GET /channel-config` + `PUT /channel-config`

**关键校准点**：Hono 的 multipart 解析 API（`c.req.parseBody`）需执行时验证签名。

**自检：** tsc + curl 测导入粘贴文本（场景 5/6）。

### Step 8 — 挂载到 `src/index.ts`

**修改 `backend/src/index.ts`**：import topicRouter，`.route('/topics', topicRouter)`。

**自检：** 后端启动无错，health 仍 200。

### Step 9 — 前端 `/topics` 页

**创建 `frontend/app/topics/page.tsx`**（'use client'）。三个区：
- 表单区：种子词 textarea + 数量 select + 频道描述折叠 + 生成按钮
- 导入区：粘贴 textarea + 导入按钮 + 文件 input + 导入按钮 + 已导入数 + 清空按钮
- 列表区：status tab 筛选 + 选题卡片（title/rationale/status/操作按钮）

用 `fetch(\`${process.env.NEXT_PUBLIC_API_BASE}/...\`)` 调后端。loading 态 + error 态。原生 HTML + 内联 style，与首页一致。

**自检：** `npm -C frontend run dev`，浏览器访问 `:3000/topics`，页面渲染无报错。

### Step 10 — `tests/topic.test.ts`

**创建 `backend/tests/topic.test.ts`**：
- `parseImportText` 单测：纯标题 / title,views / 含表头 / 异常行（覆盖场景 5/6/7/8）
- `buildGeneratePrompt` 单测：含/不含频道描述、含/不含历史数据
- `generateTopics` 单测：mock `ask` 返回合法 JSON → 验证返回结构；mock 返回 markdown 包裹 JSON → 验证 strip；mock 返回非 JSON → 验证抛错
- mock `ask` 方式：`vi.mock('../src/agent/index.js', () => ({ ask: vi.fn() }))`

**自检：** `npm test` 全绿。

### Step 11 — 端到端验证

1. `npm test` 通过
2. `npm run lint` 通过
3. 启后端，验证无 key 路径：
   - `POST /topics/generate {"seeds":["x"]}` → 503
   - `POST /topics/import {"text":"标题1,100"}` → 200 `{imported:1,skipped:0}`
   - `GET /topics` → 200
   - `PATCH /topics/1 {"status":"adopted"}` → 200
4. 启前端，访问 `/topics`：
   - 导入粘贴文本 → 看到已导入数
   - 点生成（无 key）→ 看到 503 错误提示
   - 列表能看到导入后生成的空列表 + 已导入数据
5. 若用户配了 key：真实生成选题验证场景 1/14
6. `git status` 确认 db 文件仍被忽略

## 2. 不在本计划内

- 文案生成（`copy-generation`）
- 选题编辑
- 流式响应
- YouTube API 抓取
- 真实 LLM 自动化测试

## 3. 回滚

- Step 1-2 失败：revert schema.sql，删 repo.ts
- Step 4 失败（JSON 解析设计有误）：调整 strip/parse 策略，必要时放宽（接受非标准 JSON 用正则提 title/rationale）
- Step 9 失败：前端页降级为仅列表展示 + 生成按钮，导入用 curl
- 整体回滚：`git checkout version/v0.1 -- .`，feature 分支废弃重拉

## 4. 完成后

- `git add -A && git commit -m "feat: topic inspiration (AI 生成 + 历史导入 + 工作台页)"`
- `/opsx:archive` 归档（需人工确认数据模型提升到 spec/design.md）
- merge 回 `version/v0.1`
- 勾选 `spec/tasks.md` 对应 task（3/5）
- 追加 `spec/devlog.md`
