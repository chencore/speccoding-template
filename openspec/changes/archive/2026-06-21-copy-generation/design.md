# Design: copy-generation

> **数据模型变更**：无（复用既有 `copies` + `copy_versions` 表）
> **跨模块影响**：新增 copy 模块，依赖 topic 模块 + agent 模块——均在 v0.1 已覆盖
> **新增外部依赖**：无

---

## 1. 版本数与文案类型约定

| 类型 | 版本数 | 说明 |
|------|--------|------|
| title | 5 | CTR 核心，需多版 A/B |
| description | 2 | hook + 正文 + 引导，2 版够对比 |
| tags | 1 | 关键词集合，逗号分隔，1 版足够 |

`copies.type` 字段值：`title` / `description` / `tags`。`copy_versions.content`：
- title：单个标题字符串
- description：完整描述文本
- tags：逗号分隔字符串（如 `"AI编程, 独立开发, 效率工具"`）

## 2. 模块结构

```
backend/src/
├── copy/
│   ├── index.ts         # 路由汇总（暂不用，路由直接在 routes/copy.ts）
│   ├── repo.ts          # copies + copy_versions 的 DB 操作
│   ├── generate.ts      # 生成逻辑（构造 prompt + 调 ask + 解析 JSON + 批量写库）
│   ├── rewrite.ts       # 改写逻辑（构造 prompt + 调 ask + 写新版本）
│   └── prompt.ts        # prompt 构造（生成 + 改写）
└── routes/
    └── copy.ts          # HTTP 路由
```

## 3. 关键流程

### 生成流程
```
1. 收到 topic_id
2. 读 topic（title + rationale），不存在 → 404
3. 读 channel_description
4. 构造生成 prompt（见下）
5. 调 ask(prompt, { tools: [] })
6. strip 代码块 + JSON.parse
7. 校验结构：{ titles: string[5], descriptions: string[2], tags: string }
8. 事务写入：
   - 创建 3 条 copies（type=title/description/tags，adopted_version_id=null）
   - 为每个 copy 创建对应数量的 copy_versions（version_no 从 1 递增，is_adopted=0）
   - 默认每个 copy 的 v1 标记为 adopted？—— 否，让用户手动选，初始都 is_adopted=0
9. 返回完整 copies + versions 结构
```

### 改写流程
```
1. 收到 copy_id + source_version_id + instruction
2. 读 copy（type + topic_id）+ source version（content）
3. 读 topic（title + rationale）+ channel_description
4. 构造改写 prompt：原文 + 类型 + 改写指令 + 要求输出纯文本（单版本，非 JSON）
5. 调 ask(prompt, { tools: [] })
6. 取返回 text（strip 代码块若 AI 多事包了）
7. 查当前 copy 最大 version_no，+1 得新 version_no
8. INSERT copy_versions（is_adopted=0）
9. 返回新版本
```

### 采用切换流程
```
1. 收到 copy_id + version_id
2. 校验 version 属于该 copy
3. 事务：
   - UPDATE copy_versions SET is_adopted=0 WHERE copy_id=?
   - UPDATE copy_versions SET is_adopted=1 WHERE id=?
   - UPDATE copies SET adopted_version_id=? WHERE id=?
4. 返回更新后的 copy（含 versions）
```

## 4. Prompt 设计

### 生成 prompt
```
你是 YouTube 文案助手。基于以下选题生成文案。

选题标题：{topic.title}
选题理由：{topic.rationale}
频道描述：{channel_description or "未提供"}

请生成：
- titles：5 个不同风格的视频标题（吸睛、含关键词、不超过 60 字）
- descriptions：2 个视频描述（hook 开头 + 正文 + 互动引导，200-500 字，可用 emoji 和换行）
- tags：1 组标签（逗号分隔的字符串，10-15 个，覆盖核心关键词）

严格输出 JSON：
{"titles":["...","...","...","...","..."],"descriptions":["...","..."],"tags":"...,...,..."}

不要输出任何其他内容。
```

### 改写 prompt
```
你是 YouTube 文案改写助手。请改写以下{type}文案。

原{type}：
{source.content}

选题背景：{topic.title} — {topic.rationale}
频道调性：{channel_description or "未提供"}

改写指令：{instruction}

要求：
- 保持是{type}文案（不要改成其他类型）
- 输出纯文本，不要 JSON、不要 markdown 代码块、不要解释
- {type} 对应要求：{title 不超 60 字 / description 200-500 字 / tags 逗号分隔}
```

## 5. API 契约

### `POST /api/v1/topics/:id/copies/generate`
- Response 200: `{ copies: [{ id, type, adopted_version_id, versions: [{ id, version_no, content, is_adopted }] }] }`
- Response 404: topic 不存在
- Response 503: LLM 调用失败
- Response 502: AI 输出解析失败

### `POST /api/v1/copies/:copyId/rewrite`
- Request: `{ sourceVersionId: number, instruction: string }`
- Response 200: `{ version: { id, copy_id, version_no, content, is_adopted } }`
- Response 404: copy 或 source version 不存在
- Response 503/502: 同上

### `GET /api/v1/topics/:id/copies`
- Response 200: `{ copies: [...] }`（结构同 generate 返回）
- Response 404: topic 不存在

### `PATCH /api/v1/copies/:copyId/adopt`
- Request: `{ versionId: number }`
- Response 200: `{ copy: { ...含 versions } }`
- Response 404: copy 或 version 不存在
- Response 400: version 不属于该 copy

## 6. 关键决策与权衡

### 决策 1：一次生成三类而非分类生成
- **选择**：一键生成 title + description + tags
- **放弃**：分类生成（先标题后描述后标签）
- **理由**：三类相互关联（描述呼应标题、标签从标题描述提炼），一次生成更连贯；单人生成效率优先

### 决策 2：差异化版本数（5/2/1）
- **选择**：标题 5、描述 2、标签 1
- **放弃**：统一版本数
- **理由**：标题是 CTR 核心需多版 A/B；描述 2 版够对比；标签是关键词集合多版意义小

### 决策 3：改写用纯 prompt 不用工具
- **选择**：改写时把"原文 + 指令"塞 prompt
- **放弃**：注册 `get_copy_version` 工具让 AI 自主调
- **理由**：改写输入明确（就是某版本），直接塞 prompt 可控；与选题/生成保持纯 prompt 风格一致

### 决策 4：初始版本不自动 adopted
- **选择**：生成后所有版本 is_adopted=0，用户手动采用
- **放弃**：自动把 v1 标 adopted
- **理由**：避免误导用户"已采用"；强制用户做 A/B 决策更符合"多版本对比"意图

### 决策 5：改写输出纯文本非 JSON
- **选择**：改写 prompt 要求输出纯文本
- **放弃**：统一用 JSON
- **理由**：改写是单版本，JSON 包裹反而增加解析步骤和 AI 出错率；纯文本直接存 content

### 决策 6：topic 详情页而非独立 copies 页
- **选择**：`/topics/:id` 详情页承载文案
- **放弃**：独立 `/copies` 页
- **理由**：文案强绑定 topic，详情页语义清晰；避免列表页过载；URL 可分享

## 7. 风险

- **AI 输出 JSON 不合规**：titles 数量不足 / 字段缺失。Mitigation：解析后校验，缺哪类跳过哪类（不整体失败），返回时标注哪些类生成成功；若全失败返 502。
- **改写输出含多余内容**：AI 可能加"以下是改写结果："前缀。Mitigation：strip 常见前缀/代码块；保留原文兜底（解析后若空则用原文）。
- **并发采用切换**：理论上单人无并发，但事务保证原子性。
- **copy_versions 无限增长**：反复改写会堆积版本。Mitigation：v0.1 不删，UI 上只展示最近 N 版（如 10）；留下个版本做版本管理。
