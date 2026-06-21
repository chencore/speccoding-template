# Design: topic-library

> **数据模型变更**：`topics` 表新增 `category`（可空 text）
> **跨模块影响**：topic 模块调用 AI 分类；history 查询增加 category 字段
> **新增外部依赖**：无（复用 `pi-ai`）

---

## 1. 模块结构

```
backend/src/
├── topic/
│   ├── repo.ts          # 新增 updateTopicCategory、getTopicById
│   └── classify.ts      # AI 分类逻辑
├── persistence/
│   └── history.ts       # 查询增加 category
└── routes/
    ├── topic.ts         # PATCH /:id 自动分类；PATCH /:id/category
    └── history.ts       # 返回 category
frontend/app/
└── history/
    └── page.tsx         # 升级为选题库：筛选/分组/改分类
```

## 2. 数据模型

### topics（变更）

| 字段 | 类型 | 说明 |
|------|------|------|
| `category` | `TEXT` | 选题类型，可空 |

## 3. 预设分类

```typescript
export const TOPIC_CATEGORIES = [
  "教程/干货",
  "评测/体验",
  "观点/评论",
  "Vlog/日常",
  "热点/资讯",
  "故事/案例",
  "其他",
] as const;
```

## 4. AI 分类逻辑

### `classifyTopic(title: string, rationale: string | null): Promise<string>`

Prompt 要求 LLM 从预设分类中选择一个最匹配的，只返回分类名，不返回解释。

### 触发时机

- `PATCH /topics/:id` 将 status 改为 `adopted` 时
- `PATCH /topics/:id/category` 的 `auto=true` 参数时

## 5. API 契约

### `PATCH /api/v1/topics/:id`（已有）

当 `status = adopted` 时：
- 自动调用 `classifyTopic`
- 返回的 topic 包含 `category`

### `PATCH /api/v1/topics/:id/category`

Request body:
```json
{
  "category": "评测/体验",
  "auto": false
}
```

或自动重新分类：
```json
{
  "auto": true
}
```

Response: updated topic

### `GET /api/v1/history`（已有）

Response 中 topic 增加 `category` 字段。

## 6. 前端页面

### `/history`（选题库）

- 顶部标题改为「选题库」
- 分类筛选器：全部 / 未分类 / 各预设类型
- 列表按分类分组展示（未分类放最后）
- 每个 topic 卡片内显示当前分类下拉框，可修改
- 「未分类」分组卡片提供「自动分类」按钮
- 保留返回首页链接和查看详情入口

## 7. 关键决策

### 决策 1：分类存储在 topics 表，而非新建 category 表
- **选择**：`topics.category` 文本字段
- **放弃**：新建 `categories` 表做外键
- **理由**：单人工具、分类固定且数量少，单字段更简单；未来若需自定义分类再拆表

### 决策 2：分类在采纳时触发，而非生成时
- **选择**：status → adopted 时调用 AI 分类
- **放弃**：生成 topic 时同时分类
- **理由**：生成阶段选题可能只是候选，分类价值在采纳后更高；避免对弃用选题浪费 token

### 决策 3：预设分类 + 手动修正，不做自定义分类 CRUD
- **选择**：固定 7 个分类，用户只能选或改
- **放弃**：用户可增删改分类
- **理由**：v0.1 深切片保持简单；分类体系由创作者本人定义，变更频率低
