# Design: topic-inspiration

> **数据模型变更**：新增 `imported_videos` 表 + `channel_config` 表——需提升到 `spec/design.md`（归档时人工确认）。
> **跨模块影响**：新增 topic 模块，依赖 agent 模块——kickoff 已覆盖 agent，topic 模块边界本变更自含。
> **新增外部依赖**：CSV 解析用轻量方案（手写或 nan-csv），不引重库。

---

## 1. 数据模型变更

### 新表 `imported_videos`
```sql
CREATE TABLE IF NOT EXISTS imported_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  views INTEGER,              -- 可空，粘贴纯 title 时无 views
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 新表 `channel_config`
```sql
CREATE TABLE IF NOT EXISTS channel_config (
  key TEXT PRIMARY KEY,       -- 当前仅 'channel_description'
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
单条记录设计（key-value），避免为单一字段建整表；将来加更多配置可直接复用。

### `topics` 表
沿用既有 schema，无变更。生成时 `seed` 存种子词（多个用 `;` 连接），`status` 默认 `pending`。

**归档时需提升以上两表到 `spec/design.md` 第 4 节。**

## 2. 模块结构

```
backend/src/
├── topic/
│   ├── index.ts           # 路由汇总
│   ├── generate.ts        # 生成逻辑（构造 prompt + 调 ask + 写库）
│   ├── import.ts          # 导入逻辑（解析粘贴/CSV + 写库）
│   ├── prompt.ts          # prompt 构造
│   └── repo.ts            # topics + imported_videos + channel_config 的 DB 操作
├── routes/
│   └── topic.ts           # HTTP 路由层
└── db/
    └── schema.sql         # 追加两表
```

## 3. 关键流程

### 选题生成流程
```
1. 收到 { seeds, count? }
2. 读 channel_config.channel_description（可能为空）
3. 读 imported_videos 全部（按 views DESC 排序，取 top 50 避免过长）
4. 构造 prompt：频道描述 + 历史标题列表 + 种子词 + 要求生成 count 条 + 每条带 rationale + JSON 输出格式
5. 调 AgentService.ask(prompt) —— 注意：ask 默认带 echo 工具，这里传空 tools 数组避免无关工具干扰
6. 解析返回文本为 JSON（AI 可能返回 markdown 代码块包裹的 JSON，需 strip）
7. 逐条写入 topics 表（seed 连接、status=pending）
8. 返回生成的选题列表
```

### Prompt 设计
```
你是自媒体选题助手。基于以下信息生成 {count} 条 YouTube 选题。

频道描述：{channel_description or "未提供"}

历史视频（按播放量排序，供参考避免重复 + 找新角度）：
1. {title1} ({views1} 次播放)
2. {title2} ({views2} 次播放)
...

种子词：{seeds.join("、")}

要求：
- 每条选题含 title（选题标题）和 rationale（推荐理由，一句话说明为什么适合这个频道）
- 选题不与历史视频标题重复
- 贴合频道调性
- 严格输出 JSON 数组：[{"title":"...","rationale":"..."}]
- 不要输出任何其他内容
```

### 导入流程
```
1. 判断 content-type：multipart/form-data → 取文件；application/json → 取 body.text
2. 解析：
   - CSV 文件：按行解析，首行若为 "title,views" 表头则跳过
   - 粘贴文本：按行解析，每行 "title,views" 或纯 title
3. 逐行验证：title 非空；views 若有需为数字，否则置 null
4. 批量 INSERT 到 imported_videos
5. 返回 { imported: N, skipped: M, errors: [...] }
```

CSV 解析**手写**（schema 固定 2 列，不引库）：按 `\n` 分行、按 `,` 分列、strip 引号。处理引号内含逗号的边界情况——v0.1 简化处理：若行内逗号数 > 1，视为格式错误跳过（YouTube 导出的标题通常不含逗号或含引号包裹，简单 strip 可覆盖）。

## 4. API 契约

### `POST /api/v1/topics/generate`
- Request: `{ "seeds": ["AI编程","独立开发"], "count": 10 }`
- Response 200: `{ "topics": [{ "id": 1, "title": "...", "rationale": "...", "status": "pending" }, ...] }`
- Response 503: LLM 调用失败（复用 agent 错误）
- Response 400: seeds 为空

### `POST /api/v1/topics/import`
- Content-Type: `multipart/form-data`（字段 `file`）或 `application/json`（字段 `text`）
- Response 200: `{ "imported": 15, "skipped": 2 }`
- Response 400: 无 file 也无 text

### `GET /api/v1/topics?status=pending&page=1&pageSize=20`
- Response 200: `{ "items": [...], "total": 42, "page": 1, "pageSize": 20 }`

### `PATCH /api/v1/topics/:id`
- Request: `{ "status": "adopted" }`
- Response 200: `{ "id": 1, "status": "adopted" }`
- Response 400: status 非法值
- Response 404: id 不存在

### `GET /api/v1/imported-videos`
- Response 200: `{ "items": [{ "id": 1, "title": "...", "views": 1234, "imported_at": "..." }] }`

### `DELETE /api/v1/imported-videos`
- Response 200: `{ "deleted": 15 }`

### `GET /api/v1/channel-config`
- Response 200: `{ "channel_description": "..." }`

### `PUT /api/v1/channel-config`
- Request: `{ "channel_description": "..." }`
- Response 200: `{ "channel_description": "..." }`

## 5. 关键决策与权衡

### 决策 1：纯 prompt 不用工具
- **选择**：历史数据直接塞进 prompt，不注册 `list_imported_videos` 工具让 AI 自主调
- **放弃**：工具调用方式
- **理由**：选题生成本质是单轮"给输入出 N 条"，历史数据作为上下文一次性注入更可控；工具调用增加轮次和不确定性；工具框架留给文案改写等多轮场景

### 决策 2：AI 输出 JSON 格式
- **选择**：要求 AI 输出严格 JSON 数组，后端 `JSON.parse`
- **放弃**：自由文本后端正则提取
- **理由**：JSON 结构化便于直接写库；DeepSeek v4 pro 对 JSON 输出指令遵循好；解析失败时返回 502 + 原始文本供调试

### 决策 3：新建 imported_videos 表而非复用 topics
- **选择**：独立 `imported_videos` 表
- **放弃**：复用 topics 加 source 字段
- **理由**：导入数据是"参考素材"非"选题产物"，语义不同；混进 topics 会污染选题列表；独立表查询和清理都简单

### 决策 4：channel_config 用 key-value 单表
- **选择**：key-value 结构，当前仅 `channel_description` 一条
- **放弃**：为频道描述建专用表
- **理由**：单一字段建整表过重；key-value 可扩展（将来加默认语言、风格偏好等）

### 决策 5：CSV 手写解析
- **选择**：按行按列 split + strip
- **放弃**：引 papaparse / csv-parse 等库
- **理由**：schema 固定 2 列（title, views），手写够用；YouTube 导出标题简单场景能覆盖；引库增加依赖体积

## 6. 前端最小页

`frontend/app/topics/page.tsx`：
- 顶部表单区：
  - 种子词输入（textarea，逗号或换行分隔）
  - 生成数量 select（5/10/20，默认 10）
  - 频道描述配置（折叠面板，textarea + 保存按钮）
  - 生成按钮
- 历史导入区（折叠面板）：
  - 粘贴 textarea + 导入按钮
  - 文件上传 input + 导入按钮
  - 显示已导入数量 + 清空按钮
- 选题列表区：
  - 按 status 分组或带筛选 tab（全部/待用/采用/弃用）
  - 每条卡片：title + rationale + status 标签 + 操作按钮（采用/弃用/恢复待用）
  - 生成中 loading 态

不引 UI 组件库，用原生 HTML + 内联样式（与首页一致风格）。fetch 调后端 API，`NEXT_PUBLIC_API_BASE` 环境变量。

## 7. 风险

- **AI 不严格输出 JSON**：可能返回 markdown 代码块或多余文本。Mitigation：解析前 strip ```json 代码块标记；解析失败返回 502 + 原文。
- **历史数据过多导致 prompt 过长**：top 50 标题可能仍超 token。Mitigation：按 views 排序取 top 30；超长时进一步截断。
- **CSV 解析边界**：标题含逗号/引号/换行。Mitigation：v0.1 简化处理，格式异常行跳过并计数；文档化"标题含逗号请用引号包裹"。
- **频道描述未配置时生成质量**：AI 缺少调性上下文。Mitigation：prompt 中明确"未提供频道描述，请基于种子词和历史数据推断"；不阻塞生成。
