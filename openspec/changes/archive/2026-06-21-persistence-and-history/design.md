# Design: persistence-and-history

> **数据模型变更**：无（复用既有 `topics` / `copies` / `copy_versions`）
> **跨模块影响**：新增 history 模块，依赖 copy 模块 + topic 模块的 DB 表
> **新增外部依赖**：无

---

## 1. 模块结构

```
backend/src/
├── persistence/
│   └── history.ts      # 历史记录查询逻辑
└── routes/
    └── history.ts      # HTTP 路由
frontend/app/
└── history/
    └── page.tsx        # 历史记录页
```

## 2. 查询逻辑

### `listAdoptedTopicsWithCopies()`

```sql
SELECT * FROM topics WHERE status = 'adopted' ORDER BY id DESC
```

对每个 topic，再查其 copies 及每个 copy 下 `is_adopted = 1` 的 version：

```sql
SELECT cv.*
FROM copies c
JOIN copy_versions cv ON cv.copy_id = c.id
WHERE c.topic_id = ? AND cv.is_adopted = 1
ORDER BY c.type ASC
```

若某 copy 当前无 adopted version，则该 copy 不返回 content。

## 3. API 契约

### `GET /api/v1/history`

Response 200:
```json
{
  "items": [
    {
      "topic": { "id", "seed", "title", "rationale", "status", "created_at" },
      "copies": [
        { "id", "type", "adopted_version_id", "versions": [{ "id", "version_no", "content", "is_adopted", "created_at" }] }
      ]
    }
  ]
}
```

## 4. 前端页面

`/history`：
- 顶部标题「历史记录」+ 返回首页链接
- 空态：「还没有已采用的选题」
- 列表：每个 topic 一张卡片
  - topic title + rationale + 采用时间
  - 三类文案只展示 adopted 版本（标题/描述/标签）
  - 「查看详情」→ `/topics/<id>`

## 5. 关键决策

### 决策 1：只展示 adopted 版本，不展示全部版本
- **选择**：历史记录页只保留最终决策结果
- **放弃**：把全部 versions 也列出来
- **理由**：历史记录用于「回顾最终产出」，全版本对比留在 topic 详情页

### 决策 2：按 topic.id 倒序而非按 adopted 时间倒序
- **选择**：按 topic.id DESC
- **放弃**：按 copies.adopted_version_id 的 max created_at 排序
- **理由**：topic 创建时间稳定可预期，且 simpler；v0.1 无需精确到版本级时间线
